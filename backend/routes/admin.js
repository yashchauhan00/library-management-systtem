import express from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Item from "../models/Item.js";
import Copy from "../models/Copy.js";

import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/memberships", async (req, res) => {
  const memberships = await Membership.find({}).sort({ createdAt: -1 });
  res.json({ memberships });
});

router.put("/memberships/:code", async (req, res) => {
  const code = req.params.code;
  const {
    name,
    borrowDurationDays,
    finePerDay,
    maxBorrowLimit,
    membershipCode,
  } = req.body ?? {};

  if (!name) return res.status(400).json({ message: "name is required" });
  const doc = await Membership.findOneAndUpdate(
    { membershipCode: membershipCode || code },
    {
      membershipCode: membershipCode || code,
      name,
      borrowDurationDays,
      finePerDay,
      maxBorrowLimit,
    },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ membership: doc });
});

router.get("/items", async (req, res) => {
  const { type } = req.query;
  const filter = type ? { itemType: type } : {};
  const items = await Item.find(filter).sort({ createdAt: -1 });
  res.json({ items });
});

router.put("/items/:itemCode", async (req, res) => {
  const itemCode = req.params.itemCode;
  const {
    title,
    authorName,
    category,
    itemType,
    totalCopies,
    availableCopies,
  } = req.body ?? {};
  if (!title || !category || !itemType) {
    return res.status(400).json({ message: "title, category, itemType are required" });
  }
  const total = Number(totalCopies ?? 0);
  const available = Number(availableCopies ?? total);
  const doc = await Item.findOneAndUpdate(
    { itemCode },
    {
      itemCode,
      title,
      authorName: authorName ?? "",
      category,
      itemType,
      totalCopies: total,
      availableCopies: Math.max(0, available),
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Ensure copies exist so serial numbers can be used during issue/return.
  const existingCopies = await Copy.find({ item: doc._id }).sort({ createdAt: 1 });
  const existingCount = existingCopies.length;

  if (existingCount < total) {
    const toCreate = total - existingCount;
    for (let i = 0; i < toCreate; i++) {
      const serialNo = `${itemCode}-${existingCount + i + 1}`;
      // eslint-disable-next-line no-await-in-loop
      await Copy.create({ serialNo, item: doc._id, status: "available" });
    }
  }

  const allCopies = await Copy.find({ item: doc._id }).sort({ createdAt: 1 });
  const desiredAvailable = Math.max(0, Math.min(allCopies.length, available));

  // Mark first N as available, rest as issued (inventory admin update behavior).
  for (let i = 0; i < allCopies.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Copy.updateOne(
      { _id: allCopies[i]._id },
      { status: i < desiredAvailable ? "available" : "issued" }
    );
  }

  res.json({ item: doc, copiesUpdated: true });
});

router.get("/users", async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).populate("membership").sort({ createdAt: -1 });
  res.json({ users });
});

router.put("/users/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { name, password, role, membershipCode, status } = req.body ?? {};

  if (!name) return res.status(400).json({ message: "name is required" });
  let membership = null;
  if (membershipCode) {
    membership = await Membership.findOne({ membershipCode: String(membershipCode).trim() });
    if (!membership) return res.status(400).json({ message: "Invalid membershipCode" });
  }

  const existing = await User.findOne({ userId });
  let passwordHash = existing?.passwordHash;
  if (password) {
    passwordHash = await bcrypt.hash(String(password), 10);
  }
  if (!passwordHash) return res.status(400).json({ message: "password is required for new users" });

  const doc = await User.findOneAndUpdate(
    { userId },
    {
      userId,
      name,
      passwordHash,
      role: role || existing?.role || "user",
      membership: membership?._id ?? existing?.membership ?? null,
      status: status || existing?.status || "active",
    },
    { upsert: true, new: true, runValidators: true }
  ).populate("membership");

  res.json({ user: doc });
});

export default router;

