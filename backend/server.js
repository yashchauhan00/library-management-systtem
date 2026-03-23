const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./db");
const User = require("./models/User");

const authRoutes = require("./routes/auth");
const maintenanceRoutes = require("./routes/maintenance");
const transactionRoutes = require("./routes/transactions");
const reportRoutes = require("./routes/reports");
const booksRoutes = require("./routes/books");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Library Management API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/books", booksRoutes);

app.post("/api/setup/default-admin", async (req, res) => {
  const exists = await User.findOne({ username: "admin" });
  if (exists) return res.json({ message: "Admin already exists" });
  const admin = await User.create({
    name: "Admin",
    username: "admin",
    password: "admin123",
    role: "admin"
  });
  res.json({ message: "Default admin created", id: admin._id });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed", err.message);
    process.exit(1);
  });
