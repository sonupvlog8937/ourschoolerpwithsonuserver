const mongoose = require("mongoose");

// Fee Assignment Schema - To assign fee groups to students
const feeAssignmentSchema = new mongoose.Schema({
  school: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'School', 
    required: true,
    index: true 
  },
  student: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'StudentAdmission', 
    required: true 
  },
  feeGroup: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'FeeGroup', 
    required: true 
  },
  class: { 
    type: mongoose.Schema.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  section: { 
    type: String,
    trim: true,
    default: ''
  },
  session: { 
    type: String, 
    required: true,
    trim: true
  },
  // Fee type breakdown with amounts
  feeTypes: [{
    feeType: { 
      type: mongoose.Schema.ObjectId, 
      ref: 'FeeType',
      required: true 
    },
    amount: { 
      type: Number, 
      required: true,
      default: 0
    },
    dueDate: {
      type: Date
    }
  }],
  totalAmount: { 
    type: Number, 
    required: true,
    default: 0
  },
  paidAmount: { 
    type: Number, 
    default: 0
  },
  balanceAmount: { 
    type: Number, 
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  status: { 
    type: String, 
    enum: ['Assigned', 'Partially Paid', 'Fully Paid', 'Overdue'],
    default: 'Assigned'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  assignedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedDate: { 
    type: Date, 
    default: Date.now 
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes
feeAssignmentSchema.index({ school: 1, student: 1, session: 1 });
feeAssignmentSchema.index({ school: 1, class: 1, section: 1 });
feeAssignmentSchema.index({ school: 1, feeGroup: 1 });
feeAssignmentSchema.index({ status: 1 });

// Update balance before saving
feeAssignmentSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.paidAmount - this.discount;
  
  // Update status based on payment
  if (this.balanceAmount <= 0) {
    this.status = 'Fully Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partially Paid';
  } else {
    this.status = 'Assigned';
  }
  
  next();
});

const FeeAssignment = mongoose.model("FeeAssignment", feeAssignmentSchema);

module.exports = FeeAssignment;
