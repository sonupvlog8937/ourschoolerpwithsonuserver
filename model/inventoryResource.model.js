const mongoose = require("mongoose");

const inventoryResourceSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: {
    type: String,
    enum: [
      "item-category",
      "add-item",
      "item-bundle",
      "supplier-list",
      "purchase",
      "sell",
      "sell-collection",
      "cancelled-invoice",
      "return-invoice",
      "item-receive-sell"
    ],
    required: true,
    index: true,
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Completed"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

inventoryResourceSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryResource", inventoryResourceSchema);
