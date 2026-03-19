import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    authorName: { type: String, required: false, trim: true, default: "" },
    category: { type: String, required: true, trim: true },
    itemType: { type: String, enum: ["book", "movie"], required: true },
    totalCopies: { type: Number, required: true, min: 0 },
    availableCopies: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Item", ItemSchema);

