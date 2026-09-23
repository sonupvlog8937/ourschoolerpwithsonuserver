const mongoose = require("mongoose");

const onlineClassResourceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    resource: {
      type: String,
      required: true,
      enum: [
        "course",
        "lesson-report",
        "live-class",
        "live-dashboard",
        "my-classrooms",
      ],
      index: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OnlineClassResource", onlineClassResourceSchema);
