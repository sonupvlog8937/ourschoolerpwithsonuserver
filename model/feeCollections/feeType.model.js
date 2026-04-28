const mongoose = require("mongoose");

// Fee Type Schema - For defining types of fees
const feeTypeSchema = new mongoose.Schema({
  school: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'School', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  feeCode: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    default: ''
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create compound index for school and name to ensure uniqueness per school
feeTypeSchema.index({ school: 1, name: 1 }, { unique: true });
feeTypeSchema.index({ school: 1, feeCode: 1 }, { unique: true });

// Update timestamp before saving
feeTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const FeeType = mongoose.model("FeeType", feeTypeSchema);

module.exports = FeeType;
