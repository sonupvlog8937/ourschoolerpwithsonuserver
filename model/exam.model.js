const mongoose = require("mongoose");

const examResources = [
  "terms",
  "common-type",
  "type",
  "grading-system",
  "system",
  "co-scholastic-grade",
  "co-scholastic-area",
  "schedule",
  "online-exam",
  "hall-ticket",
  "marks-multi-subject",
  "subject-remarks-all",
  "subject-remarks",
  "marks",
  "co-scholastic-marks",
  "marks-report",
  "report-card",
  "promote-structure",
  "test-assignment",
  "bulk-attendance-update",
  "system-config",
];

const examSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    resource: { type: String, enum: examResources, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["Active", "Inactive", "Pending", "Completed"], default: "Active" },
    createdBy: { type: mongoose.Schema.ObjectId, required: true },
  },
  { timestamps: true }
);

examSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("Exam", examSchema);
