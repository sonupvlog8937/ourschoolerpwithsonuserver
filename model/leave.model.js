const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  applicant_type: { type: String, enum: ["Teacher", "Student"], required: true },
  applicant: { type: mongoose.Schema.ObjectId, refPath: "applicant_type", required: true },
  leave_type: { type: String, required: true }, // Sick, Casual, Emergency, etc.
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  attachment: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  approved_by: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
  approval_date: { type: Date },
  remarks: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Leave", leaveSchema);
