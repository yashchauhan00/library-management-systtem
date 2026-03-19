import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body ?? {};
    if (!userId || !password) {
      return res.status(400).json({ message: "userId and password are required" });
    }

    const user = await User.findOne({ userId: String(userId).trim() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (user.status !== "active") return res.status(403).json({ message: "User is not active" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { role: user.role },
      process.env.JWT_SECRET,
      { subject: String(user._id), expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      token,
      role: user.role,
      user: { userId: user.userId, name: user.name, membershipId: user.membership ?? null },
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId).populate("membership");
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({
    user: {
      userId: user.userId,
      name: user.name,
      role: user.role,
      membership: user.membership,
    },
  });
});

export default router;

