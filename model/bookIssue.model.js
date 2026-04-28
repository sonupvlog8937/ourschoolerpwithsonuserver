const mongoose = require("mongoose");

const bookIssueSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  book: { type: mongoose.Schema.ObjectId, ref: "LibraryBook", required: true },
  member_type: { type: String, enum: ["Student", "Teacher"], required: true },
  member: { type: mongoose.Schema.ObjectId, refPath: "member_type", required: true },
  issue_date: { type: Date, default: Date.now },
  due_date: { type: Date, required: true },
  return_date: { type: Date },
  fine: { type: Number, default: 0 },
  status: { type: String, enum: ["Issued", "Returned", "Overdue"], default: "Issued" },
  remarks: { type: String, default: "" },
  issued_by: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BookIssue", bookIssueSchema);
