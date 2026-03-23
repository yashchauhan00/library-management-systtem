const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    mediaType: { type: String, enum: ["book", "movie"], default: "book" },
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    availability: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
