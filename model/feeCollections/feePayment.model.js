const mongoose = require("mongoose");

// Payment Transaction Model - Individual payment records for fee assignments
const feePaymentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentAdmission",
      required: true,
    },
    feeAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentFeeAssignment",
      required: function() {
        return this.feeType !== 'carry-forward';
      },
    },
    feeType: {
      type: String,
      enum: ["regular", "carry-forward"],
      default: "regular",
    },
    paymentId: {
      type: String,
      unique: true,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    discountGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeDiscount",
      default: null,
    },
    fineAmount: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Cheque", "DD", "Bank Transfer", "UPI", "Card"],
      default: "Cash",
    },
    note: {
      type: String,
      default: "",
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    },
    collectedByName: {
      type: String,
      default: "",
    },
    isReverted: {
      type: Boolean,
      default: false,
    },
    revertedAt: {
      type: Date,
    },
    revertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    },
    revertedByName: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Generate payment ID and receipt number before saving
feePaymentSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.paymentId) {
      const count = await mongoose.model("FeePayment").countDocuments({ school: this.school });
      this.paymentId = `PAY${count + 1}/${new Date().getFullYear()}`;
    }
    
    if (!this.receiptNumber) {
      const count = await mongoose.model("FeePayment").countDocuments({ school: this.school });
      this.receiptNumber = `REC${Date.now()}${count + 1}`;
    }
  }
  
  next();
});

module.exports = mongoose.model("FeePayment", feePaymentSchema);
