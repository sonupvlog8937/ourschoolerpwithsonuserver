const mongoose = require("mongoose");

// ─── Purpose Schema ───────────────────────────────────────────────────────────
const purposeSchema = new mongoose.Schema(
  {
    school:      { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

purposeSchema.index({ school: 1, name: 1 }, { unique: true });

// ─── Complaint Type Schema ────────────────────────────────────────────────────
const complaintTypeSchema = new mongoose.Schema(
  {
    school:      { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

complaintTypeSchema.index({ school: 1, name: 1 }, { unique: true });

// ─── Source Schema ────────────────────────────────────────────────────────────
const sourceSchema = new mongoose.Schema(
  {
    school:      { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

sourceSchema.index({ school: 1, name: 1 }, { unique: true });

// ─── Reference Schema ─────────────────────────────────────────────────────────
const referenceSchema = new mongoose.Schema(
  {
    school:      { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

referenceSchema.index({ school: 1, name: 1 }, { unique: true });

// ─── Export Models ────────────────────────────────────────────────────────────
module.exports = {
  Purpose:       mongoose.model("Purpose", purposeSchema),
  ComplaintType: mongoose.model("ComplaintType", complaintTypeSchema),
  Source:        mongoose.model("Source", sourceSchema),
  Reference:     mongoose.model("Reference", referenceSchema),
};
