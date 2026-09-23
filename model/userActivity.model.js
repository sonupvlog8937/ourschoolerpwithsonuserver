const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  userId: { type: mongoose.Schema.ObjectId },
  user: { type: String, required: true, trim: true },
  role: { type: String, default: "User", trim: true },
  action: { type: String, required: true, trim: true },
  status: { type: String, enum: ["Success", "Failed"], default: "Success" },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

module.exports = mongoose.model("UserActivity", userActivitySchema);
