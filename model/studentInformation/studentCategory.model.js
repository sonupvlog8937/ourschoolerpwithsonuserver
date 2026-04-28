const mongoose = require('mongoose');

const studentCategorySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: Number },
  },
  { timestamps: true }
);

studentCategorySchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StudentCategory', studentCategorySchema);
