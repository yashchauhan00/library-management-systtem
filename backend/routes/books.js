const express = require("express");
const Book = require("../models/Book");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const books = await Book.find().sort({ author: 1, title: 1 });
  res.json(books);
});

module.exports = router;
