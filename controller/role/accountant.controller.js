require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Accountant = require("../../model/role/accountant.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  // Register Accountant
  registerAccountant: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, email, password, phone, address, qualification, experience, salary } = req.body;

      const existingAccountant = await Accountant.findOne({ email });
      if (existingAccountant) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const accountant = new Accountant({
        school: schoolId,
        name,
        email,
        password: hashedPassword,
        phone,
        address: address || "",
        qualification: qualification || "",
        experience: experience || "",
        salary: salary || 0,
      });

      await accountant.save();

      res.status(201).json({ success: true, message: "Accountant registered successfully", data: accountant });
    } catch (error) {
      console.error("Error registering accountant:", error);
      res.status(500).json({ success: false, message: "Error registering accountant", error: error.message });
    }
  },

  // Login Accountant
  loginAccountant: async (req, res) => {
    try {
      const { email, password } = req.body;

      const accountant = await Accountant.findOne({ email }).populate("school", "school_name");
      if (!accountant) {
        return res.status(404).json({ success: false, message: "Accountant not found" });
      }

      if (accountant.status === "Inactive") {
        return res.status(403).json({ success: false, message: "Account is inactive" });
      }

      const isPasswordValid = await bcrypt.compare(password, accountant.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          id: accountant._id,
          schoolId: accountant.school._id,
          role: "ACCOUNTANT",
          name: accountant.name,
          email: accountant.email,
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: accountant._id,
          name: accountant.name,
          email: accountant.email,
          role: "ACCOUNTANT",
          school_name: accountant.school.school_name,
          image_url: accountant.accountant_image,
        },
      });
    } catch (error) {
      console.error("Error logging in accountant:", error);
      res.status(500).json({ success: false, message: "Error logging in", error: error.message });
    }
  },

  // Get all accountants
  getAllAccountants: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const accountants = await Accountant.find({ school: schoolId }).select("-password");
      res.status(200).json({ success: true, data: accountants });
    } catch (error) {
      console.error("Error fetching accountants:", error);
      res.status(500).json({ success: false, message: "Error fetching accountants", error: error.message });
    }
  },

  // Get accountant details
  getAccountantDetails: async (req, res) => {
    try {
      const accountantId = req.user.id;
      const accountant = await Accountant.findById(accountantId).populate("school", "school_name").select("-password");

      if (!accountant) {
        return res.status(404).json({ success: false, message: "Accountant not found" });
      }

      res.status(200).json({ success: true, data: accountant });
    } catch (error) {
      console.error("Error fetching accountant details:", error);
      res.status(500).json({ success: false, message: "Error fetching details", error: error.message });
    }
  },

  // Update accountant
  updateAccountant: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const accountant = await Accountant.findByIdAndUpdate(id, updates, { new: true });

      if (!accountant) {
        return res.status(404).json({ success: false, message: "Accountant not found" });
      }

      res.status(200).json({ success: true, message: "Accountant updated successfully", data: accountant });
    } catch (error) {
      console.error("Error updating accountant:", error);
      res.status(500).json({ success: false, message: "Error updating accountant", error: error.message });
    }
  },

  // Delete accountant
  deleteAccountant: async (req, res) => {
    try {
      const { id } = req.params;
      const accountant = await Accountant.findByIdAndDelete(id);

      if (!accountant) {
        return res.status(404).json({ success: false, message: "Accountant not found" });
      }

      res.status(200).json({ success: true, message: "Accountant deleted successfully" });
    } catch (error) {
      console.error("Error deleting accountant:", error);
      res.status(500).json({ success: false, message: "Error deleting accountant", error: error.message });
    }
  },
};
