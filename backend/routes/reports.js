import express from "express";

import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import IssueRequest from "../models/IssueRequest.js";

const router = express.Router();

router.use(requireAuth);

router.get("/active-issues", async (req, res) => {
  const filter = req.auth?.role === "user" ? { status: "active", user: req.auth.userId } : { status: "active" };
  const transactions = await Transaction.find(filter)
    .populate("user")
    .populate("item")
    .populate("copy")
    .sort({ issueDate: -1 });
  return res.json({
    transactions: transactions.map((t) => ({
      ...t.toObject(),
      serialNo: t.copy?.serialNo || null,
      authorName: t.item?.authorName || null,
    })),
  });
});

router.get("/master/members", async (req, res) => {
  const users = await User.find({ role: "user" })
    .populate("membership")
    .sort({ createdAt: -1 });
  return res.json({ users });
});

router.get("/master/items", async (req, res) => {
  const { type } = req.query;
  const filter = type ? { itemType: type } : {};
  const items = await Item.find(filter).sort({ createdAt: -1 });
  return res.json({ items });
});

router.get("/overdue-returns", async (req, res) => {
  const now = new Date();

  const baseFilter =
    req.auth?.role === "user"
      ? { status: "returned", returnDate: { $ne: null }, user: req.auth.userId }
      : { status: "returned", returnDate: { $ne: null } };

  const transactions = await Transaction.find(baseFilter)
    .populate("user")
    .populate("item")
    .populate("copy")
    .sort({ returnDate: -1 });

  const overdue = transactions
    .filter((t) => t.returnDate && t.dueDate && t.returnDate.getTime() > t.dueDate.getTime())
    .map((t) => {
      const lateDays = Math.ceil((t.returnDate - t.dueDate) / (24 * 60 * 60 * 1000));
      return {
        ...t.toObject(),
        lateDays: Math.max(0, lateDays),
        overdue: true,
        overdueByDays: lateDays,
        serialNo: t.copy?.serialNo || null,
        authorName: t.item?.authorName || null,
      };
    });

  // Also include active overdue issues for completeness (optional for your UI)
  const activeFilter =
    req.auth?.role === "user"
      ? { status: "active", dueDate: { $lt: now }, user: req.auth.userId }
      : { status: "active", dueDate: { $lt: now } };

  const activeOverdue = await Transaction.find(activeFilter)
    .populate("user")
    .populate("item")
    .populate("copy");

  return res.json({
    returnedLate: overdue,
    activeOverdue: activeOverdue.map((t) => ({
      ...t.toObject(),
      serialNo: t.copy?.serialNo || null,
      authorName: t.item?.authorName || null,
    })),
  });
});

router.get("/pending-issue-requests", async (req, res) => {
  const filter =
    req.auth?.role === "user" ? { status: "pending", user: req.auth.userId } : { status: "pending" };

  const requests = await IssueRequest.find(filter)
    .populate("user")
    .populate("item")
    .sort({ requestedAt: 1 });
  return res.json({ requests });
});

export default router;

