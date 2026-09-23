const mongoose = require("mongoose");

const timetableResourceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    resource: {
      type: String,
      required: true,
      enum: ["configurations", "subject-requirements", "teacher-workload", "generate", "view-active-timetable"],
      index: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TimetableResource", timetableResourceSchema);
