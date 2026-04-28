const mongoose = require('mongoose');

const feeDiscountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Discount name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  discountCode: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Discount code cannot exceed 20 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixAmount'],
    required: [true, 'Discount type is required']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage') {
          return value != null && value > 0;
        }
        return true;
      },
      message: 'Percentage is required when discount type is percentage'
    }
  },
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'fixAmount') {
          return value != null && value > 0;
        }
        return true;
      },
      message: 'Amount is required when discount type is fix amount'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableOn: {
    type: String,
    enum: ['all', 'specific'],
    default: 'all'
  },
  applicableFeeTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType'
  }],
  validFrom: {
    type: Date
  },
  validTo: {
    type: Date
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  }
}, {
  timestamps: true
});

// Index for faster queries
feeDiscountSchema.index({ school: 1, discountCode: 1 });
feeDiscountSchema.index({ school: 1, isActive: 1 });
feeDiscountSchema.index({ validFrom: 1, validTo: 1 });

// Virtual for checking if discount is currently valid
feeDiscountSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (this.validFrom && this.validTo) {
    return now >= this.validFrom && now <= this.validTo;
  }
  if (this.validFrom) {
    return now >= this.validFrom;
  }
  if (this.validTo) {
    return now <= this.validTo;
  }
  return true;
});

// Method to calculate discount amount
feeDiscountSchema.methods.calculateDiscount = function(feeAmount) {
  if (!this.isActive) return 0;
  
  if (this.discountType === 'percentage') {
    return (feeAmount * this.percentage) / 100;
  } else if (this.discountType === 'fixAmount') {
    return Math.min(this.amount, feeAmount); // Discount cannot exceed fee amount
  }
  return 0;
};

// Pre-save validation
feeDiscountSchema.pre('save', function(next) {
  if (this.validFrom && this.validTo && this.validFrom > this.validTo) {
    next(new Error('Valid From date cannot be after Valid To date'));
  }
  next();
});

const FeeDiscount = mongoose.model('FeeDiscount', feeDiscountSchema);

module.exports = FeeDiscount;
