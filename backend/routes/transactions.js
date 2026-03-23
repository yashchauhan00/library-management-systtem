const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const Membership = require("../models/Membership");
const IssueTransaction = require("../models/IssueTransaction");
const Fine = require("../models/Fine");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const toDateOnly = (value) => new Date(new Date(value).toISOString().split("T")[0]);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/availability", async (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    const author = String(req.query.author || "").trim();
    const category = String(req.query.category || "").trim();
    if (!title && !author && !category) {
      return res.status(400).json({ message: "Select at least one search field" });
    }
    const q = {};
    if (title) q.title = new RegExp(escapeRegex(title), "i");
    if (author) q.author = new RegExp(escapeRegex(author), "i");
    if (category) q.category = new RegExp(escapeRegex(category), "i");
    const books = await Book.find(q);
    res.json(books);
  } catch (err) {
    console.error("availability search", err);
    res.status(500).json({ message: err.message || "Search failed" });
  }
});

router.post("/issue", async (req, res) => {
  try {
  const { bookId, membershipNumber, issueDate, returnDate, remarks = "" } = req.body;
  if (!bookId || !issueDate) {
    return res.status(400).json({ message: "Book, and issue date required" });
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({
      message: "Pehle search karke table me se book select karo (last column radio)"
    });
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(400).json({
      message: "Book database me nahi mila — dubara search karke select karo"
    });
  }
  if (!book.availability) return res.status(400).json({ message: "Book not available" });

  const memberNo = String(membershipNumber).trim();
  if (!memberNo) {
    return res.status(400).json({ message: "Membership number is required" });
  }
  const member = await Membership.findOne({ membershipNumber: memberNo });
  if (!member) {
    return res.status(400).json({
      message: `Member nahi mila: "${memberNo}". Maintenance se sahi Membership Number likho (jaise M123...)`
    });
  }

  const today = toDateOnly(new Date());
  const issue = toDateOnly(issueDate);
  if (issue < today) return res.status(400).json({ message: "Issue date cannot be less than today" });

  const maxReturn = new Date(issue);
  maxReturn.setDate(maxReturn.getDate() + 15);
  const selectedReturn = returnDate ? toDateOnly(returnDate) : maxReturn;
  if (selectedReturn > maxReturn) {
    return res.status(400).json({ message: "Return date cannot exceed 15 days" });
  }

  const tx = await IssueTransaction.create({
    book: book._id,
    member: member._id,
    issueDate: issue,
    returnDate: selectedReturn,
    remarks,
    status: "issued"
  });
  book.availability = false;
  await book.save();
  res.json(await tx.populate(["book" ,"member"]));
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message || "Issue book failed" });
  }
});

router.post("/return", async (req, res) => {
  const { transactionId, serialNumber, returnDate, remarks = "" } = req.body;
  if (!transactionId || !serialNumber) {
    return res.status(400).json({ message: "Serial number and transaction required" });
  }
  const tx = await IssueTransaction.findById(transactionId).populate("book");
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (tx.status !== "issued") {
    return res.status(400).json({ message: "This book is not an active issue" });
  }
  if (tx.book.serialNumber !== serialNumber) {
    return res.status(400).json({ message: "Serial number mismatch" });
  }

  const note = String(remarks || "").trim();
  if (note) {
    tx.remarks = tx.remarks ? `${tx.remarks}\n${note}` : note;
  }

  tx.actualReturnDate = returnDate ? toDateOnly(returnDate) : toDateOnly(new Date());
  tx.status = "returned";
  await tx.save();

  tx.book.availability = true;
  await tx.book.save();

  const due = toDateOnly(tx.returnDate);
  const actual = toDateOnly(tx.actualReturnDate);
  const delayDays = Math.max(0, Math.ceil((actual - due) / (1000 * 60 * 60 * 24)));
  const amount = delayDays * 10;
  const fine = await Fine.create({ issueTransaction: tx._id, amount });

  res.json({ transaction: tx, fine, nextPage: "pay-fine" });
});

router.post("/pay-fine", async (req, res) => {
  const { transactionId, finePaid = false, remarks = "" } = req.body;
  const tx = await IssueTransaction.findById(transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  const fine = await Fine.findOne({ issueTransaction: tx._id });
  if (!fine) return res.status(404).json({ message: "Fine details missing" });

  if (fine.amount > 0 && !finePaid) {
    return res.status(400).json({ message: "Fine must be paid before completion" });
  }

  fine.finePaid = Boolean(finePaid);
  fine.remarks = remarks;
  await fine.save();
  res.json({ message: "Return completed", fine });
});

router.get("/issues", async (req, res) => {
  const data = await IssueTransaction.find().populate(["book", "member"]).sort({ createdAt: -1 });
  res.json(data);
});

module.exports = router;
