const mongoose = require('mongoose');

const feeCarryForwardSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAdmission',
    required: [true, 'Student is required'],
    index: true
  },
  admissionNo: {
    type: String,
    trim: true
  },
  studentName: {
    type: String,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  rollNumber: {
    type: String,
    trim: true
  },
  fromSession: {
    type: String,
    required: [true, 'From session is required'],
    trim: true
  },
  toSession: {
    type: String,
    required: [true, 'To session is required'],
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  className: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  previousBalance: {
    type: Number,
    required: [true, 'Previous balance is required'],
    min: [0, 'Previous balance cannot be negative'],
    default: 0
  },
  carriedAmount: {
    type: Number,
    required: [true, 'Carried amount is required'],
    min: [0, 'Carried amount cannot be negative'],
    default: 0
  },
  adjustmentAmount: {
    type: Number,
    default: 0
  },
  finalCarriedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'cancelled'],
    default: 'pending'
  },
  processedDate: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
feeCarryForwardSchema.index({ school: 1, student: 1, toSession: 1 });
feeCarryForwardSchema.index({ school: 1, status: 1 });
feeCarryForwardSchema.index({ school: 1, fromSession: 1, toSession: 1 });
feeCarryForwardSchema.index({ school: 1, class: 1 });

// Calculate final carried amount before save
feeCarryForwardSchema.pre('save', function(next) {
  this.finalCarriedAmount = this.carriedAmount + (this.adjustmentAmount || 0);
  if (this.finalCarriedAmount < 0) {
    this.finalCarriedAmount = 0;
  }
  next();
});

// Prevent duplicate carry forward for same student and session
feeCarryForwardSchema.index(
  { school: 1, student: 1, toSession: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

const FeeCarryForward = mongoose.model('FeeCarryForward', feeCarryForwardSchema);

module.exports = FeeCarryForward;
