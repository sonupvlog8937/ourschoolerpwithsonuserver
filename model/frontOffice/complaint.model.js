const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    school:        { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    complaintNo:   { type: Number },                          // auto-incremented per school
    complaintBy:   { type: String, required: true, trim: true },
    phone:         { type: String, trim: true, default: "" },
    date:          { type: Date, default: Date.now },
    complaintType: {
      type: String,
      trim: true,
      default: "Other",
      // enum removed to allow dynamic values from Setup
    },
    source: {
      type: String,
      trim: true,
      default: "Other",
      // enum removed to allow dynamic values from Setup
    },
    description:  { type: String, trim: true, default: "" },
    actionTaken:  { type: String, trim: true, default: "" },
    assignedTo:   { type: String, trim: true, default: "" },
    note:         { type: String, trim: true, default: "" },
    attachment:   { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

// Auto-increment complaintNo per school before save
complaintSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await this.constructor
      .findOne({ school: this.school })
      .sort({ complaintNo: -1 })
      .select("complaintNo");
    this.complaintNo = (last?.complaintNo ?? 0) + 1;
  }
  next();
});

module.exports = mongoose.model("Complaint", complaintSchema);
