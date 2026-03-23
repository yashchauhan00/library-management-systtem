const express = require("express");
const User = require("../models/User");
const Membership = require("../models/Membership");
const Book = require("../models/Book");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

router.post("/membership", async (req, res) => {
  const { name, address, email, phone, durationMonths } = req.body;
  if (!name || !address || !email || !phone || !durationMonths) {
    return res.status(400).json({ message: "All fields are mandatory" });
  }
  const membershipNumber = `M${Date.now()}`;
  const startDate = new Date();
  const endDate = addMonths(startDate, Number(durationMonths));
  const member = await Membership.create({
    membershipNumber,
    name,
    address,
    email,
    phone,
    durationMonths: Number(durationMonths),
    startDate,
    endDate,
  });
  res.json(member);
});

router.get("/membership/:membershipNumber", async (req, res) => {
  const member = await Membership.findOne({
    membershipNumber: req.params.membershipNumber,
  });
  if (!member) return res.status(404).json({ message: "Member not found" });
  res.json(member);
});

router.get("/memberships", async (req, res) => {
  const members = await Membership.find().sort({ createdAt: -1 });
  res.json(members);
});

router.put("/membership/:membershipNumber", async (req, res) => {
  const { action, extensionMonths = 6 } = req.body;
  const member = await Membership.findOne({
    membershipNumber: req.params.membershipNumber,
  });
  if (!member) return res.status(404).json({ message: "Member not found" });
  if (action === "cancel") member.status = "cancelled";
  if (action === "extend")
    member.endDate = addMonths(member.endDate, Number(extensionMonths));
  await member.save();
  res.json(member);
});

router.post("/book", async (req, res) => {
  const {
    mediaType = "book",
    title,
    author,
    category,
    serialNumber,
    availability,
  } = req.body;
  if (
    !title ||
    !author ||
    !category ||
    !serialNumber ||
    availability === undefined
  ) {
    return res.status(400).json({ message: "All fields are mandatory" });
  }
  const book = await Book.create({
    mediaType,
    title,
    author,
    category,
    serialNumber,
    availability: Boolean(availability),
  });
  res.json(book);
});

router.put("/book/:id", async (req, res) => {
  const {
    mediaType = "book",
    title,
    author,
    category,
    serialNumber,
    availability,
  } = req.body;
  if (
    !title ||
    !author ||
    !category ||
    !serialNumber ||
    availability === undefined
  ) {
    return res.status(400).json({ message: "All fields are mandatory" });
  }
  const book = await Book.findByIdAndUpdate(
    req.params.id,
    {
      mediaType,
      title,
      author,
      category,
      serialNumber,
      availability: Boolean(availability),
    },
    { new: true },
  );
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
});

router.delete("/book/:id", async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json({ message: "Book deleted" });
});

router.post("/user", async (req, res) => {
  const {
    mode = "new",
    name,
    username,
    password,
    role = "user",
    isActive = true,
    userId,
  } = req.body;
  if (!name) return res.status(400).json({ message: "Name is mandatory" });
  if (mode === "new") {
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password required" });
    const user = await User.create({
      name,
      username,
      password,
      role,
      isActive,
    });
    return res.json(user);
  }
  if (!userId)
    return res
      .status(400)
      .json({ message: "userId required for existing user" });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.name = name;
  user.role = role;
  user.isActive = Boolean(isActive);
  if (password) user.password = password;
  await user.save();
  res.json(user);
});

router.put("/user/:id", async (req, res) => {
  const { name, username, password, role = "user", isActive = true } = req.body;
  if (!name || !username) {
    return res.status(400).json({ message: "Name and username are mandatory" });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.name = name;
  user.username = username;
  user.role = role;
  user.isActive = Boolean(isActive);
  if (password) user.password = password;
  await user.save();
  res.json(user);
});

router.delete("/user/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deleted" });
});

router.get("/books", async (req, res) => {
  const books = await Book.find().sort({ createdAt: -1 });
  res.json(books);
});

router.get("/users", async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

router.delete("/membership/:membershipNumber", async (req, res) => {
  const member = await Membership.findOneAndDelete({
    membershipNumber: req.params.membershipNumber,
  });
  if (!member) return res.status(404).json({ message: "Member not found" });
  res.json({ message: "Membership deleted" });
});

module.exports = router;
