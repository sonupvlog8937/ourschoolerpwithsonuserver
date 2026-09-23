const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  itemCode: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  unit: {
    type: String,
    default: 'pcs',
    trim: true
  },
  currentStock: {
    type: Number,
    default: 0
  },
  minStockLevel: {
    type: Number,
    default: 0
  },
  maxStockLevel: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  sellingPrice: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  supplier: {
    name: { type: String, default: '' },
    contact: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  location: {
    type: String,
    default: '',
    trim: true
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
}, {
  timestamps: true
});

// Indexes
inventoryItemSchema.index({ school: 1, itemCode: 1 }, { unique: true });
inventoryItemSchema.index({ school: 1, category: 1 });
inventoryItemSchema.index({ currentStock: 1 });

// Pre-save middleware to calculate total value
inventoryItemSchema.pre('save', function(next) {
  this.totalValue = this.currentStock * this.unitPrice;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
