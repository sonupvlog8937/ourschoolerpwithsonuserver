const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: {
    type: String,
    enum: [
      "payment-requests",
      "event-collections",
      "income-category",
      "expense-category",
      "account-head",
      "income",
      "expenses",
      "income-report",
      "expense-report",
      "daily-monthly-report",
      "overall-summary",
      "group-wise-overall",
    ],
    required: true,
    index: true,
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Completed"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

accountSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("Account", accountSchema);
