const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  name: { type: String, required: true, trim: true },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

sectionSchema.index({ school: 1, name: 1 }, { unique: true });
module.exports = mongoose.model("Section", sectionSchema);
