const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: { type: String, required: true, enum: ["pillar", "event-type", "event-master", "entry", "verification", "sports-profile", "sports-setup"], index: true },
  student: { type: mongoose.Schema.ObjectId, ref: "Student", default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Verified", "Rejected"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

studentProfileSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("StudentProfile", studentProfileSchema);