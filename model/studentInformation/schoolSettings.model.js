const mongoose = require('mongoose');

const schoolSettingsSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bulkDeleteDisabled: {
    type: Boolean,
    default: false,
  },
  multiClassDisabled: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('SchoolSettings', schoolSettingsSchema);
