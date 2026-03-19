import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    copy: { type: mongoose.Schema.Types.ObjectId, ref: "Copy" },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    status: { type: String, enum: ["active", "return_pending", "returned"], default: "active" },

    fineAmount: { type: Number, default: 0, min: 0 },
    finePaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);

