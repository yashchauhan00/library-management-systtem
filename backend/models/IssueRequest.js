import mongoose from "mongoose";

const IssueRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    requestedAt: { type: Date, default: () => new Date() },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    approvedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    rejectedReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("IssueRequest", IssueRequestSchema);

