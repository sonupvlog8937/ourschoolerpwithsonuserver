const bcrypt = require("bcryptjs");
const OTP = require("../model/otp.model");
const School = require("../model/role/school.model");
const Student = require("../model/role/student.model");
const Teacher = require("../model/role/teacher.model");
const Accountant = require("../model/role/accountant.model");
const Librarian = require("../model/role/librarian.model");
const Receptionist = require("../model/role/receptionist.model");
const Parent = require("../model/role/parent.model");

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to find user across all models
const findUserByEmail = async (email) => {
  const models = [School, Student, Teacher, Accountant, Librarian, Receptionist, Parent];
  
  for (const Model of models) {
    const user = await Model.findOne({ email });
    if (user) {
      return { user, model: Model };
    }
  }
  return null;
};

// Send OTP to email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const result = await findUserByEmail(email.toLowerCase());
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address",
      });
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase(), purpose: "password_reset" });

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP to database
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // TODO: Send OTP via email service
    // For now, we'll just log it (in production, use nodemailer or similar)
    console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email address. Valid for 10 minutes.",
      // Remove this in production:
      developmentOTP: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: "password_reset",
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: "OTP not found or has expired",
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`,
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const result = await findUserByEmail(email.toLowerCase());
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address",
      });
    }

    // Check if last OTP was sent recently (rate limiting - 60 seconds)
    const lastOTP = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: "password_reset",
    }).sort({ createdAt: -1 });

    if (lastOTP && new Date() - lastOTP.createdAt < 60000) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
      });
    }

    // Delete existing OTPs
    await OTP.deleteMany({ email: email.toLowerCase(), purpose: "password_reset" });

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    console.log(`Resent OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: "New OTP sent to your email address",
      developmentOTP: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Find and verify OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      purpose: "password_reset",
      verified: true,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP. Please verify OTP first.",
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Find user
    const result = await findUserByEmail(email.toLowerCase());
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    result.user.password = hashedPassword;
    await result.user.save();

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again.",
    });
  }
};
