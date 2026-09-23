const mongoose = require("mongoose");

const studentBankSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  resource: { type: String, enum: ["wallets", "transactions"], required: true, index: true },
  student: { type: mongoose.Schema.ObjectId, ref: "StudentAdmission", default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ["Active", "Inactive", "Pending", "Completed"], default: "Active" },
  createdBy: { type: mongoose.Schema.ObjectId, required: true },
}, { timestamps: true });

studentBankSchema.index({ school: 1, resource: 1, createdAt: -1 });

module.exports = mongoose.model("StudentBank", studentBankSchema);