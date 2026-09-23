const mongoose = require("mongoose");

const leaveResourceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    resource: {
      type: String,
      required: true,
      enum: ["type", "define-policy", "apply-staff", "staff-requests", "staff-balance"],
      index: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveResource", leaveResourceSchema);
