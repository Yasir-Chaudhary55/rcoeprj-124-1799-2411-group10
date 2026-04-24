const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookRequestSchema = new Schema({
  user:   { type: Schema.Types.ObjectId, ref: "User",   required: true },
  book:   { type: Schema.Types.ObjectId, ref: "Book",   required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  dueDate: { type: Date },
  requestDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("BookRequest", bookRequestSchema);