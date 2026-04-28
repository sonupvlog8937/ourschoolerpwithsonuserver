const mongoose = require("mongoose");

// Fee Group Schema - For grouping fees
const feeGroupSchema = new mongoose.Schema({
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
feeGroupSchema.index({ school: 1, name: 1 }, { unique: true });

// Update timestamp before saving
feeGroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const FeeGroup = mongoose.model("FeeGroup", feeGroupSchema);

module.exports = FeeGroup;
