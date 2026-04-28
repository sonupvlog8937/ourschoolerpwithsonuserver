const mongoose = require("mongoose");

// Fee Master Schema - For defining fee structures
const feeMasterSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
  feesGroup: { type: String, required: true }, // e.g., "Balance Master"
  feesCode: { type: String, required: true }, // e.g., "Previous Session Balance"
  amount: { type: Number, required: true, default: 0 },
  dueDate: { type: Date },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  class: { type: mongoose.Schema.ObjectId, ref: 'Class' },
  section: { type: String },
  category: { type: String }, // RTE, General, etc.
  fineType: { type: String, enum: ['None', 'Percentage', 'Fix Amount'], default: 'None' },
  finePercentage: { type: Number, default: 0 },
  fineAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Student Fee Assignment Schema - Links students to fee masters
const studentFeeAssignmentSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
  student: { type: mongoose.Schema.ObjectId, ref: 'StudentAdmission', required: true },
  feeMaster: { type: mongoose.Schema.ObjectId, ref: 'FeeMaster', required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  fineAmount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  dueDate: { type: Date },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  paymentHistory: [{
    paymentId: { type: mongoose.Schema.ObjectId, ref: 'FeeCollection' },
    amount: { type: Number },
    date: { type: Date },
    mode: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate balance before saving
studentFeeAssignmentSchema.pre('save', function(next) {
  this.balance = this.amount - this.paidAmount - this.discountAmount + this.fineAmount;
  
  // Update status based on balance
  if (this.balance <= 0) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Unpaid';
  }
  
  this.updatedAt = Date.now();
  next();
});

const FeeMaster = mongoose.model("FeeMaster", feeMasterSchema);
const StudentFeeAssignment = mongoose.model("StudentFeeAssignment", studentFeeAssignmentSchema);

module.exports = { FeeMaster, StudentFeeAssignment };
