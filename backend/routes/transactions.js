import express from "express";

import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Item from "../models/Item.js";
import Copy from "../models/Copy.js";
import Transaction from "../models/Transaction.js";
import IssueRequest from "../models/IssueRequest.js";

const router = express.Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function calcLateDays({ dueDate, returnDate }) {
  if (!dueDate || !returnDate) return 0;
  const diff = returnDate.getTime() - dueDate.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

router.use(requireAuth);

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysOnly(date, days) {
  const d = toDateOnly(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function getUserMembership(user) {
  const membership = user.membership;
  if (membership) return membership;
  return Membership.findOne({ membershipCode: "DEFAULT" }).catch(() => null);
}

router.post("/search-available-copies", async (req, res) => {
  try {
    const { type, title, authorName, category } = req.body ?? {};
    const typeNorm = type ? String(type).toLowerCase() : null;

    const hasAnySearch = Boolean(title || authorName || category || typeNorm);
    if (!hasAnySearch) {
      return res.status(400).json({ message: "Fill at least one search field" });
    }

    const itemFilter = {};
    if (typeNorm) itemFilter.itemType = typeNorm;
    if (title) itemFilter.title = { $regex: String(title).trim(), $options: "i" };
    if (authorName) itemFilter.authorName = { $regex: String(authorName).trim(), $options: "i" };
    if (category) itemFilter.category = { $regex: String(category).trim(), $options: "i" };

    const items = await Item.find(itemFilter).select({ _id: 1 });
    if (!items.length) return res.json({ results: [] });

    const copies = await Copy.find({ item: { $in: items.map((i) => i._id) }, status: "available" })
      .populate("item")
      .sort({ serialNo: 1 });

    return res.json({
      results: copies.map((c) => ({
        serialNo: c.serialNo,
        title: c.item.title,
        authorName: c.item.authorName,
        category: c.item.category,
        itemType: c.item.itemType,
        available: true,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Search failed" });
  }
});

router.post("/issue-by-serial", async (req, res) => {
  try {
    const { serialNo, issueDate, returnDate, remarks } = req.body ?? {};
    if (!serialNo) return res.status(400).json({ message: "serialNo is required" });
    if (!issueDate) return res.status(400).json({ message: "issueDate is required" });
    if (!returnDate) return res.status(400).json({ message: "returnDate is required" });

    const user = await User.findById(req.auth.userId).populate("membership");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "active") return res.status(403).json({ message: "User is not active" });

    const copy = await Copy.findOne({ serialNo: String(serialNo).trim() }).populate("item");
    if (!copy) return res.status(404).json({ message: "Book copy not found" });
    if (copy.status !== "available") return res.status(409).json({ message: "Book is not available" });

    const membership = await getUserMembership(user);
    const borrowMax = membership?.maxBorrowLimit ?? Number(process.env.DEFAULT_MAX_BORROW_LIMIT || 5);
    const finePerDay = membership?.finePerDay ?? Number(process.env.DEFAULT_FINE_PER_DAY || 5);

    const activeCount = await Transaction.countDocuments({
      user: user._id,
      status: "active",
    });
    if (activeCount >= borrowMax) {
      return res.status(409).json({ message: "Borrow limit reached" });
    }

    const today = toDateOnly(new Date());
    const issue = toDateOnly(issueDate);
    const due = toDateOnly(returnDate);

    if (issue < today) return res.status(400).json({ message: "Issue date cannot be less than today" });
    if (due < issue) return res.status(400).json({ message: "Return date cannot be before issue date" });

    const maxDue = addDaysOnly(issue, 15);
    if (due > maxDue) {
      return res.status(400).json({ message: "Return date cannot be more than 15 days ahead" });
    }

    const tx = await Transaction.create({
      user: user._id,
      item: copy.item._id,
      copy: copy._id,
      issueDate: issue,
      dueDate: due,
      status: "active",
      fineAmount: 0,
      finePaid: false,
      remarks: remarks ? String(remarks) : "",
    });

    copy.status = "issued";
    await copy.save();
    await Item.updateOne({ _id: copy.item._id }, { $inc: { availableCopies: -1 } });

    return res.json({
      status: "issued",
      transactionId: tx._id,
      issueDate: tx.issueDate,
      dueDate: tx.dueDate,
      finePerDay,
    });
  } catch (err) {
    return res.status(500).json({ message: "Issue failed" });
  }
});

router.post("/return-init", async (req, res) => {
  try {
    const { serialNo, returnDate } = req.body ?? {};
    if (!serialNo) return res.status(400).json({ message: "serialNo is required" });
    if (!returnDate) return res.status(400).json({ message: "returnDate is required" });

    const user = await User.findById(req.auth.userId).populate("membership");
    if (!user) return res.status(404).json({ message: "User not found" });

    const copy = await Copy.findOne({ serialNo: String(serialNo).trim() }).populate("item");
    if (!copy) return res.status(404).json({ message: "Book copy not found" });

    const tx = await Transaction.findOne({
      user: user._id,
      copy: copy._id,
      status: "active",
    }).populate("item user");

    if (!tx) return res.status(404).json({ message: "Active issue not found for this serialNo" });

    const membership = user.membership;
    const finePerDay = membership?.finePerDay ?? Number(process.env.DEFAULT_FINE_PER_DAY || 5);

    const due = toDateOnly(tx.dueDate);
    const actualReturn = toDateOnly(returnDate);
    const lateDays = calcLateDays({ dueDate: due, returnDate: actualReturn });
    const fineAmount = Math.max(0, lateDays * finePerDay);

    tx.returnDate = actualReturn;
    tx.fineAmount = fineAmount;
    tx.finePaid = false;
    tx.status = "return_pending";
    await tx.save();

    return res.json({
      status: "return_pending",
      transactionId: tx._id,
      issueDate: tx.issueDate,
      dueDate: tx.dueDate,
      returnDate: tx.returnDate,
      fineAmount,
      finePerDay,
      remarks: tx.remarks || "",
    });
  } catch (err) {
    return res.status(500).json({ message: "Return failed" });
  }
});

router.post("/pay-fine", async (req, res) => {
  try {
    const { transactionId, finePaid, remarks } = req.body ?? {};
    if (!transactionId) return res.status(400).json({ message: "transactionId is required" });

    const tx = await Transaction.findOne({
      _id: transactionId,
      user: req.auth.userId,
      status: "return_pending",
    });
    if (!tx) return res.status(404).json({ message: "Return pending transaction not found" });

    const shouldRequirePaid = (tx.fineAmount ?? 0) > 0;
    const paidBool = Boolean(finePaid);

    if (shouldRequirePaid && !paidBool) {
      return res.status(400).json({ message: "Please confirm paid fine to complete return" });
    }

    const now = new Date();
    tx.status = "returned";
    tx.finePaid = shouldRequirePaid ? paidBool : true;
    tx.paidAt = now;
    tx.remarks = remarks ? String(remarks) : "";
    await tx.save();

    // Release the copy
    const copy = await Copy.findById(tx.copy).populate("item");
    if (copy) {
      copy.status = "available";
      await copy.save();
      await Item.updateOne({ _id: copy.item._id }, { $inc: { availableCopies: 1 } });
    }

    return res.json({ status: "returned", fineAmount: tx.fineAmount });
  } catch (err) {
    return res.status(500).json({ message: "Pay fine failed" });
  }
});

router.post("/check-availability", async (req, res) => {
  try {
    const { itemCode } = req.body ?? {};
    if (!itemCode) return res.status(400).json({ message: "itemCode is required" });

    const item = await Item.findOne({ itemCode: String(itemCode).trim() });
    if (!item) return res.status(404).json({ message: "Item not found" });

    return res.json({
      itemCode: item.itemCode,
      itemType: item.itemType,
      title: item.title,
      availableCopies: item.availableCopies,
    });
  } catch (err) {
    return res.status(500).json({ message: "Check availability failed" });
  }
});

router.post("/issue", async (req, res) => {
  try {
    const { itemCode } = req.body ?? {};
    if (!itemCode) return res.status(400).json({ message: "itemCode is required" });

    const user = await User.findById(req.auth.userId).populate("membership");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "active") return res.status(403).json({ message: "User is not active" });

    const item = await Item.findOne({ itemCode: String(itemCode).trim() });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const membership =
      user.membership ||
      (await Membership.findOne({ membershipCode: "DEFAULT" }).catch(() => null));

    const borrowDurationDays = membership?.borrowDurationDays
      ?? Number(process.env.DEFAULT_BORROW_DURATION_DAYS || 7);
    const finePerDay = membership?.finePerDay ?? Number(process.env.DEFAULT_FINE_PER_DAY || 5);
    const maxBorrowLimit =
      membership?.maxBorrowLimit ?? Number(process.env.DEFAULT_MAX_BORROW_LIMIT || 5);

    const activeCount = await Transaction.countDocuments({
      user: user._id,
      status: "active",
    });
    if (activeCount >= maxBorrowLimit) {
      return res.status(409).json({ message: "Borrow limit reached" });
    }

    const now = new Date();

    // If copies available -> issue directly, else create pending request.
    if (item.availableCopies > 0) {
      const copy = await Copy.findOne({ item: item._id, status: "available" });
      if (!copy) {
        return res.status(409).json({ message: "No available copy found" });
      }

      const transaction = await Transaction.create({
        user: user._id,
        item: item._id,
        copy: copy._id,
        issueDate: now,
        dueDate: addDays(now, borrowDurationDays),
        status: "active",
      });

      copy.status = "issued";
      await copy.save();
      await Item.updateOne({ _id: item._id }, { $inc: { availableCopies: -1 } });

      return res.json({
        status: "issued",
        transactionId: transaction._id,
        dueDate: transaction.dueDate,
        finePerDay,
      });
    }

    const request = await IssueRequest.create({
      user: user._id,
      item: item._id,
      status: "pending",
      requestedAt: now,
    });

    return res.json({
      status: "pending",
      requestId: request._id,
    });
  } catch (err) {
    return res.status(500).json({ message: "Issue failed" });
  }
});

router.post("/return", async (req, res) => {
  try {
    const { itemCode } = req.body ?? {};
    if (!itemCode) return res.status(400).json({ message: "itemCode is required" });

    const user = await User.findById(req.auth.userId).populate("membership");
    if (!user) return res.status(404).json({ message: "User not found" });

    const item = await Item.findOne({ itemCode: String(itemCode).trim() });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const activeTx = await Transaction.findOne({
      user: user._id,
      item: item._id,
      status: "active",
    });

    if (!activeTx) return res.status(404).json({ message: "No active issue found for this item" });

    const now = new Date();
    const membership = user.membership;
    const finePerDay = membership?.finePerDay ?? Number(process.env.DEFAULT_FINE_PER_DAY || 5);

    const lateDays = calcLateDays({ dueDate: activeTx.dueDate, returnDate: now });
    const fineAmount = Math.max(0, lateDays * finePerDay);

    activeTx.returnDate = now;
    activeTx.status = "returned";
    activeTx.fineAmount = fineAmount;
    activeTx.finePaid = true;
    activeTx.paidAt = now;
    await activeTx.save();

    // Return increases availability
    if (activeTx.copy) {
      const copy = await Copy.findById(activeTx.copy);
      if (copy) {
        copy.status = "available";
        await copy.save();
      }
    }
    await Item.updateOne({ _id: item._id }, { $inc: { availableCopies: 1 } });

    // Auto-approve first pending request if possible
    const pending = await IssueRequest.find({ item: item._id, status: "pending" })
      .sort({ requestedAt: 1 })
      .limit(5)
      .populate("user");

    let approved = null;

    for (const reqItem of pending) {
      const pendingUser = reqItem.user;
      // populate membership for limits (best-effort)
      if (!pendingUser.membership) continue;
      const pendingMembership = await Membership.findById(pendingUser.membership).catch(() => null);
      const pendingMaxBorrowLimit =
        pendingMembership?.maxBorrowLimit ?? Number(process.env.DEFAULT_MAX_BORROW_LIMIT || 5);
      const activeCount = await Transaction.countDocuments({
        user: pendingUser._id,
        status: "active",
      });
      if (activeCount >= pendingMaxBorrowLimit) continue;

      // Ensure a copy is available
      const freshItem = await Item.findById(item._id);
      if (!freshItem || freshItem.availableCopies <= 0) break;

      const approvedCopy = await Copy.findOne({ item: item._id, status: "available" });
      if (!approvedCopy) break;

      const pendingBorrowDurationDays =
        pendingMembership?.borrowDurationDays ??
        Number(process.env.DEFAULT_BORROW_DURATION_DAYS || 7);

      const approvedTx = await Transaction.create({
        user: pendingUser._id,
        item: item._id,
        copy: approvedCopy._id,
        issueDate: now,
        dueDate: addDays(now, pendingBorrowDurationDays),
        status: "active",
      });

      approvedCopy.status = "issued";
      await approvedCopy.save();
      await Item.updateOne({ _id: item._id }, { $inc: { availableCopies: -1 } });

      reqItem.status = "approved";
      reqItem.approvedTransaction = approvedTx._id;
      await reqItem.save();

      approved = {
        requestId: reqItem._id,
        approvedTransactionId: approvedTx._id,
        userId: pendingUser.userId,
        dueDate: approvedTx.dueDate,
      };
      break;
    }

    return res.json({
      status: "returned",
      fineAmount,
      lateDays,
      approved,
    });
  } catch (err) {
    return res.status(500).json({ message: "Return failed" });
  }
});

export default router;

