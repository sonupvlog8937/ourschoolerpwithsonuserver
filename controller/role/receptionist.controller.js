require("dotenv").config();
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const Receptionist = require("../../model/role/receptionist.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  registerReceptionist: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, email, password, phone, address, qualification, salary } = req.body;
      if (!name?.trim() || !email?.trim() || !password)
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
      const existing = await Receptionist.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(400).json({ success: false, message: "Email already exists" });
      const hashedPassword = await bcrypt.hash(password, 10);
      const receptionist = await Receptionist.create({ school: schoolId, name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword, phone: phone || "", address: address || "", qualification: qualification || "", salary: salary || 0 });
      const { password: _, ...safe } = receptionist.toObject();
      return res.status(201).json({ success: true, message: "Receptionist registered successfully", data: safe });
    } catch (error) {
      console.error("Error registering receptionist:", error);
      return res.status(500).json({ success: false, message: "Error registering receptionist", error: error.message });
    }
  },

  loginReceptionist: async (req, res) => {
    try {
      const { email, password } = req.body;
      const receptionist = await Receptionist.findOne({ email: email?.toLowerCase().trim() }).populate("school", "school_name");
      if (!receptionist) return res.status(404).json({ success: false, message: "Receptionist not found" });
      if (receptionist.status === "Inactive") return res.status(403).json({ success: false, message: "Account is inactive" });
      const isPasswordValid = await bcrypt.compare(password, receptionist.password);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });
      const token = jwt.sign({ id: receptionist._id, schoolId: receptionist.school._id, role: "RECEPTIONIST", name: receptionist.name, email: receptionist.email }, jwtSecret, { expiresIn: "7d" });
      return res.status(200).json({ success: true, message: "Login successful", token, user: { id: receptionist._id, name: receptionist.name, email: receptionist.email, role: "RECEPTIONIST", school_name: receptionist.school.school_name, image_url: receptionist.receptionist_image } });
    } catch (error) {
      console.error("Error logging in receptionist:", error);
      return res.status(500).json({ success: false, message: "Error logging in", error: error.message });
    }
  },

  getAllReceptionists: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const receptionists = await Receptionist.find({ school: schoolId }).select("-password").sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: receptionists });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching receptionists", error: error.message });
    }
  },

  getReceptionistDetails: async (req, res) => {
    try {
      const receptionist = await Receptionist.findById(req.user.id).populate("school", "school_name").select("-password");
      if (!receptionist) return res.status(404).json({ success: false, message: "Receptionist not found" });
      return res.json({ success: true, data: receptionist });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error fetching details" });
    }
  },

  updateReceptionist: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.email; delete updates.school;
      if (updates.password) { updates.password = await bcrypt.hash(updates.password, 10); }
      const receptionist = await Receptionist.findByIdAndUpdate(id, updates, { new: true }).select("-password");
      if (!receptionist) return res.status(404).json({ success: false, message: "Receptionist not found" });
      return res.json({ success: true, message: "Receptionist updated", data: receptionist });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error updating receptionist" });
    }
  },

  deleteReceptionist: async (req, res) => {
    try {
      const receptionist = await Receptionist.findByIdAndDelete(req.params.id);
      if (!receptionist) return res.status(404).json({ success: false, message: "Receptionist not found" });
      return res.json({ success: true, message: "Receptionist deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error deleting receptionist" });
    }
  },
};
