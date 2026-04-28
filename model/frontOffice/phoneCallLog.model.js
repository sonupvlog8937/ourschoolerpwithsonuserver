const mongoose = require("mongoose");

const phoneCallLogSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true },
    callType: {
      type: String,
      enum: ["Incoming", "Outgoing"],
      default: "Incoming",
    },
    followUpDate: { type: Date },
    duration: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PhoneCallLog", phoneCallLogSchema);
