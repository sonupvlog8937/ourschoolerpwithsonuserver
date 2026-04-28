const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  class: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
  subject: { type: mongoose.Schema.ObjectId, ref: "Subject", required: true },
  teacher: { type: mongoose.Schema.ObjectId, ref: "Teacher", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  homework_date: { type: Date, required: true },
  submission_date: { type: Date, required: true },
  attachment: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Completed", "Expired"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Homework", homeworkSchema);
