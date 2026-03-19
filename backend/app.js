import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import reportsRoutes from "./routes/reports.js";
import transactionsRoutes from "./routes/transactions.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/reports", reportsRoutes);
app.use("/api/transactions", transactionsRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error(err);
  return res.status(500).json({ message: "Server error" });
});

export default app;

