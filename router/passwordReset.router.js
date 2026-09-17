const express = require("express");
const router = express.Router();
const {
  forgotPassword,
  verifyOTP,
  resendOTP,
  resetPassword,
} = require("../controller/passwordReset.controller");

// POST /api/auth/forgot-password - Send OTP
router.post("/forgot-password", forgotPassword);

// POST /api/auth/verify-otp - Verify OTP
router.post("/verify-otp", verifyOTP);

// POST /api/auth/resend-otp - Resend OTP
router.post("/resend-otp", resendOTP);

// POST /api/auth/reset-password - Reset password with verified OTP
router.post("/reset-password", resetPassword);

module.exports = router;
