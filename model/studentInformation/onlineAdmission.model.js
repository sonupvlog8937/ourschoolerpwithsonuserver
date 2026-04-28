const mongoose = require('mongoose');

const onlineAdmissionSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  applicationNo: {
    type: String,
    unique: true,
    sparse: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  classApplied: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  currentAddress: {
    type: String,
  },
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  guardianPhone: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  rejectionReason: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
}, { timestamps: true });

// Auto-generate application number with better uniqueness
onlineAdmissionSchema.pre('save', async function (next) {
  if (!this.applicationNo) {
    try {
      const year = new Date().getFullYear();
      let isUnique = false;
      let attempts = 0;
      let applicationNo;

      while (!isUnique && attempts < 10) {
        // Get count of all applications
        const count = await mongoose.model('OnlineAdmission').countDocuments();
        
        // Generate application number with timestamp for uniqueness
        const timestamp = Date.now().toString().slice(-6);
        const randomNum = Math.floor(Math.random() * 100);
        applicationNo = `OA${year}${String(count + 1).padStart(4, '0')}${timestamp}${randomNum}`;

        // Check if this number already exists
        const existing = await mongoose.model('OnlineAdmission').findOne({ 
          applicationNo: applicationNo 
        });

        if (!existing) {
          isUnique = true;
          this.applicationNo = applicationNo;
        }
        
        attempts++;
      }

      // Fallback if all attempts fail
      if (!isUnique) {
        this.applicationNo = `OA${year}${Date.now()}${Math.floor(Math.random() * 10000)}`;
      }

      console.log('Generated application number:', this.applicationNo);
    } catch (error) {
      console.error('Error generating application number:', error);
      // Ultimate fallback
      this.applicationNo = `OA${new Date().getFullYear()}${Date.now()}${Math.floor(Math.random() * 10000)}`;
    }
  }
  next();
});

module.exports = mongoose.model('OnlineAdmission', onlineAdmissionSchema);
