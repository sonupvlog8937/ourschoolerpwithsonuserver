const mongoose = require("mongoose");

const studentActivitySchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Resolved"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

studentActivitySchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("StudentActivity", studentActivitySchema);