const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    membershipNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    durationMonths: { type: Number, enum: [6, 12, 24], default: 6 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Membership", membershipSchema);
