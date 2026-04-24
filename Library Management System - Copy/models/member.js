const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const memberSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, trim: true },
    phone:         { type: String, required: true },
    status:        { type: String, enum: ["Active", "Inactive"], default: "Active" },
    booksBorrowed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);