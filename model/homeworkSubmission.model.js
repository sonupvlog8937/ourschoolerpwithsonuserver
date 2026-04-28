const mongoose = require("mongoose");

const homeworkSubmissionSchema = new mongoose.Schema({
  homework: { type: mongoose.Schema.ObjectId, ref: "Homework", required: true },
  student: { type: mongoose.Schema.ObjectId, ref: "Student", required: true },
  submission_text: { type: String, default: "" },
  attachment: { type: String, default: "" },
  submitted_date: { type: Date, default: Date.now },
  marks: { type: Number, default: 0 },
  max_marks: { type: Number, default: 100 },
  remarks: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Submitted", "Evaluated"], default: "Pending" },
  evaluated_by: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
  evaluated_date: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomeworkSubmission", homeworkSubmissionSchema);
