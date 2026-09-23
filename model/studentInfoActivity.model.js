const mongoose = require("mongoose");

const studentInfoActivitySchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: { type: String, required: true, index: true },
  student: { type: mongoose.Schema.ObjectId, ref: "StudentAdmission", default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Pending", "Approved", "Rejected", "Completed"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

studentInfoActivitySchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("StudentInfoActivity", studentInfoActivitySchema);