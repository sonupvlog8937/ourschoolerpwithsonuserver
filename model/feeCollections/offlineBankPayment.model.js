const mongoose = require("mongoose");

// Offline Bank Payment Schema
const offlineBankPaymentSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
  student: { type: mongoose.Schema.ObjectId, ref: 'StudentAdmission', required: true },
  requestId: { type: String, unique: true }, // Auto-generated unique ID
  admissionNo: { type: String },
  studentName: { type: String },
  class: { type: mongoose.Schema.ObjectId, ref: 'Class' },
  paymentDate: { type: Date, required: true },
  submitDate: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  statusDate: { type: Date },
  paymentId: { type: String }, // Bank transaction ID or reference
  bankName: { type: String },
  transactionType: { 
    type: String, 
    enum: ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'DD', 'Other'],
    default: 'NEFT'
  },
  transactionNumber: { type: String },
  note: { type: String },
  attachment: { type: String }, // File path for payment proof
  approvedBy: { type: mongoose.Schema.ObjectId, ref: 'School' },
  approvedByName: { type: String },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate unique request ID before saving
offlineBankPaymentSchema.pre('save', async function(next) {
  if (!this.requestId) {
    const count = await mongoose.model('OfflineBankPayment').countDocuments();
    this.requestId = `OBP${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
offlineBankPaymentSchema.index({ school: 1, status: 1 });
offlineBankPaymentSchema.index({ school: 1, student: 1 });
offlineBankPaymentSchema.index({ requestId: 1 });

const OfflineBankPayment = mongoose.model("OfflineBankPayment", offlineBankPaymentSchema);

module.exports = OfflineBankPayment;
