const mongoose = require('mongoose');

const studentAdmissionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    admissionNo: { type: String, required: true, trim: true },
    rollNumber: { type: String, default: '', trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    photo: { type: String, default: '' },
    aadharNumber: { type: String, default: '', trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: String, default: '', trim: true },
    additionalClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    gender: { type: String, default: '', trim: true },
    dateOfBirth: { type: Date },
    admissionDate: { type: Date, default: Date.now },
    category: { type: String, default: '', trim: true },
    religion: { type: String, default: '', trim: true },
    caste: { type: String, default: '', trim: true },
    mobileNumber: { type: String, default: '', trim: true },
    alternateMobileNumber: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    bloodGroup: { type: String, default: '', trim: true },
    house: { type: String, default: '', trim: true },
    fatherName: { type: String, default: '', trim: true },
    motherName: { type: String, default: '', trim: true },
    guardianName: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    
    // Transport Details
    transportEnabled: { type: Boolean, default: false },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    pickupPoint: { type: String, default: '', trim: true },
    transportFeesMonth: { type: String, default: '', trim: true },
    
    // Hostel Details
    hostelEnabled: { type: Boolean, default: false },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', default: null },
    roomNumber: { type: String, default: '', trim: true },
    
    // Fees Details
    feesDetails: [{
      className: { type: String, default: '' },
      totalAmount: { type: Number, default: 0 },
      feeItems: [{
        feesType: { type: String, default: '' },
        dueDate: { type: Date },
        amount: { type: Number, default: 0 },
      }]
    }],
    
    // Login Credentials References
    studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    parentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', default: null },
    
    // Store plain passwords for display (encrypted passwords are in User models)
    studentPassword: { type: String, default: '' },
    parentPassword: { type: String, default: '' },
    
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },

    // Disable Details
    isDisabled: { type: Boolean, default: false, index: true },
    disableReason: { type: String, default: '', trim: true },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studentAdmissionSchema.index({ school: 1, admissionNo: 1 }, { unique: true });

module.exports = mongoose.model('StudentAdmission', studentAdmissionSchema);
