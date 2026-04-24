const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
    book:       { type: Schema.Types.ObjectId, ref: "Book",   required: true },
    member:     { type: Schema.Types.ObjectId, ref: "Member", required: true },
    issueDate:  { type: Date, default: Date.now },
    dueDate:    { type: Date, required: true },
    returnDate: { type: Date, default: null },
    fine:       { type: Number, default: 0 },
    status:     { type: String, enum: ["Issued", "Returned", "Overdue"], default: "Issued" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);