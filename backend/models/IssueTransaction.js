const mongoose = require("mongoose");

const issueTransactionSchema = new mongoose.Schema(
{
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },

  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Membership",
    required: true
  },

  issueDate: {
    type: Date,
    required: true
  },

  returnDate: {
    type: Date,
    required: true
  },

  actualReturnDate: {
    type: Date
  },

  remarks: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["issued", "returned", "pending"],
    default: "issued"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("IssueTransaction", issueTransactionSchema);