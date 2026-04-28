const mongoose = require("mongoose");

const admissionEnquirySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    studentName: { type: String, required: true, trim: true },
    guardianName: { type: String, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    alternateNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    classInterested: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    source: {
      type: String,
      trim: true,
      default: "Walk-in",
      // enum removed to allow dynamic values from Setup
    },
    referredBy: { type: String, trim: true },
    status: {
      type: String,
      enum: ["New", "Contacted", "Follow-up", "Converted", "Closed"],
      default: "New",
      index: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },
    followUpDate: { type: Date },
    assignedTo: { type: String, trim: true },
    notes: { type: String, trim: true },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdmissionEnquiry", admissionEnquirySchema);
