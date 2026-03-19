import mongoose from "mongoose";

const MembershipSchema = new mongoose.Schema(
  {
    membershipCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    borrowDurationDays: { type: Number, required: true, min: 1 },
    finePerDay: { type: Number, required: true, min: 0 },
    maxBorrowLimit: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("Membership", MembershipSchema);

