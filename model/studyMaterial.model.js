const mongoose = require("mongoose");

const studyMaterialSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  class: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
  subject: { type: mongoose.Schema.ObjectId, ref: "Subject", required: true },
  teacher: { type: mongoose.Schema.ObjectId, ref: "Teacher", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  content_type: { type: String, enum: ["PDF", "Video", "Document", "Link", "Other"], default: "PDF" },
  file_url: { type: String, default: "" },
  file_size: { type: Number, default: 0 },
  upload_date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StudyMaterial", studyMaterialSchema);
