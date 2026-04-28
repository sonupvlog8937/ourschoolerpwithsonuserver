const mongoose = require("mongoose");

const feeCollectionSchema = new mongoose.Schema(
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
    feeGroup: {
      type: String,
      default: "Balance Master",
    },
    feeCode: {
      type: String,
      default: "Balance Master (Previous Session Balance)",
    },
    dueDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    fineAmount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Cheque", "DD", "Bank Transfer", "UPI", "Card"],
      default: "Cash",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentId: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: "",
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Partial"],
      default: "Pending",
    },
    note: {
      type: String,
      default: "",
    },
    discountGroup: {
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
  },
  {
    timestamps: true,
  }
);

// Generate receipt number and calculate balance before saving
feeCollectionSchema.pre("save", async function (next) {
  if (this.isNew && !this.receiptNumber) {
    const count = await mongoose.model("FeeCollection").countDocuments();
    this.receiptNumber = `REC${Date.now()}${count + 1}`;
  }
  
  // Calculate balance
  this.balance = this.amount - this.paidAmount - this.discountAmount + this.fineAmount;
  
  // Update status based on payment
  if (this.paidAmount === 0) {
    this.status = "Pending";
  } else if (this.paidAmount >= this.amount) {
    this.status = "Paid";
  } else {
    this.status = "Partial";
  }
  
  next();
});

module.exports = mongoose.model("FeeCollection", feeCollectionSchema);
