const mongoose = require("mongoose");

const behaviourResourceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    resource: {
      type: String,
      required: true,
      enum: [
        "quick-log",
        "escalation-tickets",
        "reports",
        "class-roster",
        "categories",
        "escalation-levels",
        "my-escalations",
        "staff-student",
        "my-students",
      ],
      index: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BehaviourResource", behaviourResourceSchema);
