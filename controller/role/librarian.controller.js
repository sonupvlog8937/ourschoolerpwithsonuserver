require("dotenv").config();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const Librarian = require("../../model/role/librarian.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  registerLibrarian: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, email, password, phone, address, qualification, salary } = req.body;
      if (!name?.trim() || !email?.trim() || !password)
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
      const existing = await Librarian.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(400).json({ success: false, message: "Email already exists" });
      const hashedPassword = await bcrypt.hash(password, 10);
      const librarian = await Librarian.create({ school: schoolId, name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword, phone: phone || "", address: address || "", qualification: qualification || "", salary: salary || 0 });
      const { password: _, ...safe } = librarian.toObject();
      return res.status(201).json({ success: true, message: "Librarian registered successfully", data: safe });
    } catch (error) {
      console.error("Error registering librarian:", error);
      return res.status(500).json({ success: false, message: "Error registering librarian", error: error.message });
    }
  },

  loginLibrarian: async (req, res) => {
    try {
      const { email, password } = req.body;
      const librarian = await Librarian.findOne({ email: email?.toLowerCase().trim() }).populate("school", "school_name");
      if (!librarian) return res.status(404).json({ success: false, message: "Librarian not found" });
      if (librarian.status === "Inactive") return res.status(403).json({ success: false, message: "Account is inactive" });
      const isPasswordValid = await bcrypt.compare(password, librarian.password);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });
      const token = jwt.sign({ id: librarian._id, schoolId: librarian.school._id, role: "LIBRARIAN", name: librarian.name, email: librarian.email }, jwtSecret, { expiresIn: "7d" });
      return res.status(200).json({ success: true, message: "Login successful", token, user: { id: librarian._id, name: librarian.name, email: librarian.email, role: "LIBRARIAN", school_name: librarian.school.school_name, image_url: librarian.librarian_image } });
    } catch (error) {
      console.error("Error logging in librarian:", error);
      return res.status(500).json({ success: false, message: "Error logging in", error: error.message });
    }
  },

  getAllLibrarians: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const librarians = await Librarian.find({ school: schoolId }).select("-password").sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: librarians });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching librarians", error: error.message });
    }
  },

  getLibrarianDetails: async (req, res) => {
    try {
      const librarian = await Librarian.findById(req.user.id).populate("school", "school_name").select("-password");
      if (!librarian) return res.status(404).json({ success: false, message: "Librarian not found" });
      return res.json({ success: true, data: librarian });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error fetching details" });
    }
  },

  updateLibrarian: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      delete updates.email; delete updates.school;
      if (updates.password) { updates.password = await bcrypt.hash(updates.password, 10); }
      const librarian = await Librarian.findByIdAndUpdate(id, updates, { new: true }).select("-password");
      if (!librarian) return res.status(404).json({ success: false, message: "Librarian not found" });
      return res.json({ success: true, message: "Librarian updated", data: librarian });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error updating librarian" });
    }
  },

  deleteLibrarian: async (req, res) => {
    try {
      const librarian = await Librarian.findByIdAndDelete(req.params.id);
      if (!librarian) return res.status(404).json({ success: false, message: "Librarian not found" });
      return res.json({ success: true, message: "Librarian deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error deleting librarian" });
    }
  },
};
