import mongoose from "mongoose";

const CopySchema = new mongoose.Schema(
  {
    serialNo: { type: String, required: true, unique: true, trim: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },

    // available -> can be issued
    // issued -> currently with a user
    status: { type: String, enum: ["available", "issued"], default: "available" },
  },
  { timestamps: true }
);

export default mongoose.model("Copy", CopySchema);

