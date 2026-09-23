const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  purchaseNo: {
    type: String,
    required: true,
    trim: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  supplier: {
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' }
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
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank', 'Cheque', 'Online', 'Credit'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },
  invoiceNo: {
    type: String,
    default: ''
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
purchaseSchema.index({ school: 1, purchaseNo: 1 }, { unique: true });
purchaseSchema.index({ school: 1, purchaseDate: 1 });
purchaseSchema.index({ paymentStatus: 1 });

// Pre-save middleware
purchaseSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  if (this.balanceAmount <= 0) {
    this.paymentStatus = 'Paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Pending';
  }
  
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
