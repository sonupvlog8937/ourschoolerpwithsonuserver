const mongoose = require('mongoose');

const studentHouseSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    houseId: { type: Number },
  },
  { timestamps: true }
);

studentHouseSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StudentHouse', studentHouseSchema);
