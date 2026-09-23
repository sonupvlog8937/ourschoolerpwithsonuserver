const mongoose = require("mongoose");

const chatTicketSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  ticketNumber: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, default: "General", trim: true },
  student: { type: String, default: "", trim: true },
  grade: { type: String, default: "", trim: true },
  section: { type: String, default: "", trim: true },
  assignedTo: { type: String, default: "", trim: true },
  status: { type: String, enum: ["Open", "In Progress", "Resolved", "Closed"], default: "Open", index: true },
  rating: { type: Number, min: 0, max: 5 },
  tat: { type: Number, default: 0 },
  reopened: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("ChatTicket", chatTicketSchema);
