const mongoose = require("mongoose");

const visitorBookSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    visitorName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    idCard: { type: String, trim: true },
    idCardType: { type: String, enum: ["Aadhar", "PAN", "Driving License", "Voter ID", "Passport", "Other"], default: "Aadhar" },
    numberOfPersons: { type: Number, default: 1 },
    purpose: { type: String, required: true, trim: true },
    meetingWith: { type: String, enum: ["Student", "Teacher", "Principal", "Staff", "Other"], required: true },
    meetingPersonName: { type: String, trim: true },
    inTime: { type: Date, default: Date.now },
    outTime: { type: Date },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
    attachment: { type: String, default: "" },
    vehicleNumber: { type: String, trim: true },
    temperature: { type: Number },
    address: { type: String, trim: true },
    status: {
      type: String,
      enum: ["In", "Out", "Cancelled"],
      default: "In",
    },
    approvedBy: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
    },
  },
  { timestamps: true }
);

// Index for faster queries
visitorBookSchema.index({ school: 1, date: -1 });
visitorBookSchema.index({ status: 1 });
visitorBookSchema.index({ visitorName: "text", phone: "text" });

module.exports = mongoose.model("VisitorBook", visitorBookSchema);
