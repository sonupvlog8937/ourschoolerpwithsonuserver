const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  saleNo: {
    type: String,
    required: true,
    trim: true
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  customer: {
    type: { type: String, enum: ['Student', 'Staff', 'Other'], default: 'Student' },
    name: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentAdmission' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    contact: { type: String, default: '' }
  },
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    itemName: String,
    quantity: {
      type: Number,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  receivedAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank', 'Cheque', 'Online', 'Credit', 'Student Balance'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Received'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
saleSchema.index({ school: 1, saleNo: 1 }, { unique: true });
saleSchema.index({ school: 1, saleDate: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ 'customer.studentId': 1 });

// Pre-save middleware
saleSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.receivedAmount;
  
  if (this.balanceAmount <= 0) {
    this.paymentStatus = 'Received';
  } else if (this.receivedAmount > 0) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Pending';
  }
  
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
