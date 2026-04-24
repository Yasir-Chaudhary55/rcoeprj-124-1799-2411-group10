const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  username:         { type: String, required: true, unique: true, trim: true },
  email:            { type: String, required: true, unique: true, trim: true },
  phone:            { type: String, required: true },
  password:         { type: String, required: true },
  securityQuestion: { type: String },
  securityAnswer:   { type: String },  // stored as bcrypt hash
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
