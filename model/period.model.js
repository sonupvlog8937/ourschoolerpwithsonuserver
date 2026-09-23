// models/Period.js
const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
  period: { type: String, required: true }, // e.g., "Period 1", "Period 2"
  startTime: { type: String, required: true }, // e.g., "09:00 AM"
  endTime: { type: String, required: true }, // e.g., "09:45 AM"
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Period', periodSchema);
