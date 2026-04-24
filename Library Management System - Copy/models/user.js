const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, trim: true },
  phone:            { type: String, required: true },
  password:         { type: String, required: true },
  status:           { type: String, enum: ["Active", "Inactive"], default: "Active" },
  securityQuestion: { type: String },
  securityAnswer:   { type: String },  // stored as bcrypt hash
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
