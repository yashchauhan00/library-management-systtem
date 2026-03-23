const mongoose = require("mongoose");

const fineSchema = new mongoose.Schema(
  {
    issueTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IssueTransaction",
      required: true
    },
    amount: { type: Number, default: 0 },
    finePaid: { type: Boolean, default: false },
    remarks: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fine", fineSchema);
