const mongoose = require("mongoose");

const reportResourceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    resource: {
      type: String,
      required: true,
      enum: [
        "downloads",
        "campus-feed-engagement",
        "student-leave",
        "receipt-wise-fee",
        "fee-collected",
        "fee-discount",
        "fee-type-term-wise",
        "datewise-fee-collected",
        "termwise-fee-collected",
        "fee-balance",
        "termwise-balance",
        "fee-type-termwise-balance",
        "fee-adjustment",
        "classwise-balance-summary",
        "term-wise-fee",
        "student-more-balance",
        "fee-due-date",
        "fee-rebate",
        "deleted-fee-receipt",
        "sell-summary",
        "purchase-summary",
        "inventory-stock",
        "route-student",
        "transport-stoppage-fee",
      ],
      index: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReportResource", reportResourceSchema);
