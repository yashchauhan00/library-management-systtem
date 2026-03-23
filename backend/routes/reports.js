const express = require("express");
const Book = require("../models/Book");
const Membership = require("../models/Membership");
const IssueTransaction = require("../models/IssueTransaction");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/active-issues", async (req, res) => {
  const rows = await IssueTransaction.find({ status: "issued" }).populate(["book" ,"member"]);
  res.json(rows);
});

router.get("/overdue-returns", async (req, res) => {
  const rows = await IssueTransaction.find({
    status: "issued",
    returnDate: { $lt: new Date() }
  }).populate(["book"]);
  res.json(rows);
});

router.get("/pending-issue-requests", async (req, res) => {
  const rows = await IssueTransaction.find({ status: "pending" }).populate(["book" ,"member"]);
  res.json(rows);
});

router.get("/master-books", async (req, res) => {
  const rows = await Book.find().sort({ createdAt: -1 });
  res.json(rows);
});

router.get("/memberships", async (req, res) => {
  const rows = await Membership.find().sort({ createdAt: -1 });
  res.json(rows);
});

module.exports = router;
