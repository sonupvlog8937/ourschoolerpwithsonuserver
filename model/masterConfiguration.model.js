const mongoose = require("mongoose");

const masterConfigurationSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  module: { type: String, required: true, index: true },
  name: { type: String, default: "" },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true },
}, { timestamps: true });

masterConfigurationSchema.index({ school: 1, module: 1, createdAt: -1 });
module.exports = mongoose.model("MasterConfiguration", masterConfigurationSchema);
