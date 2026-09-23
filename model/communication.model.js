const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    resource: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: mongoose.Schema.ObjectId, required: true },
  },
  { timestamps: true }
);

communicationSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("Communication", communicationSchema);