const mongoose = require("mongoose");

const storeRoomSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: {
    type: String,
    enum: ["dashboard", "rooms", "items", "current-stock", "transactions"],
    required: true,
    index: true,
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Completed"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

storeRoomSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("StoreRoom", storeRoomSchema);
