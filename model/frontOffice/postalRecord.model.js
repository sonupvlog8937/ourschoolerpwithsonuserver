const mongoose = require("mongoose");

const postalRecordSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    type: {
      type: String,
      enum: ["Receive", "Dispatch"],
      required: true,
      index: true,
    },
    fromTo: { type: String, required: true, trim: true }, // From (receive) or To (dispatch)
    referenceNo: { type: String, trim: true },
    address: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    toTitle: { type: String, trim: true },
    note: { type: String, trim: true },
    attachment: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PostalRecord", postalRecordSchema);
