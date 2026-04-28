const mongoose = require('mongoose');

const disableReasonSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

disableReasonSchema.index({ school: 1, reason: 1 }, { unique: true });

module.exports = mongoose.model('DisableReason', disableReasonSchema);
