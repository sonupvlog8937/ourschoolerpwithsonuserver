require("dotenv").config();
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const SuperAdmin = require("../../model/role/superAdmin.model");
const School     = require("../../model/role/school.model");
const Teacher    = require("../../model/role/teacher.model");
const Student    = require("../../model/role/student.model");
const Accountant = require("../../model/role/accountant.model");
const Librarian  = require("../../model/role/librarian.model");
const Receptionist = require("../../model/role/receptionist.model");
const ViceAdmin  = require("../../model/role/viceAdmin.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  // ── Register Super Admin ───────────────────────────────────────────────────
  registerSuperAdmin: async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ success: false, message: "Name, email and password are required" });
      const existing = await SuperAdmin.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ success: false, message: "Super Admin already exists with this email" });
      const hashedPassword = await bcrypt.hash(password, 10);
      const superAdmin = await SuperAdmin.create({ name, email: email.toLowerCase(), password: hashedPassword, phone: phone || "" });
      const { password: _, ...safe } = superAdmin.toObject();
      return res.status(201).json({ success: true, message: "Super Admin registered successfully", data: safe });
    } catch (error) {
      console.error("registerSuperAdmin:", error);
      return res.status(500).json({ success: false, message: "Error registering super admin", error: error.message });
    }
  },

  // ── Login Super Admin ──────────────────────────────────────────────────────
  loginSuperAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ success: false, message: "Email and password are required" });
      const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
      if (!superAdmin) return res.status(404).json({ success: false, message: "Super Admin not found" });
      if (superAdmin.status === "Inactive") return res.status(403).json({ success: false, message: "Account is inactive" });
      const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });
      const token = jwt.sign({ id: superAdmin._id, role: "SUPERADMIN", name: superAdmin.name, email: superAdmin.email }, jwtSecret, { expiresIn: "7d" });
      return res.status(200).json({ success: true, message: "Login successful", token, user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email, role: "SUPERADMIN", image_url: superAdmin.super_admin_image } });
    } catch (error) {
      console.error("loginSuperAdmin:", error);
      return res.status(500).json({ success: false, message: "Error logging in", error: error.message });
    }
  },

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  getDashboardStats: async (req, res) => {
    try {
      const [totalSchools, totalTeachers, totalStudents, totalAccountants, totalLibrarians, totalReceptionists, totalViceAdmins] = await Promise.all([
        School.countDocuments(),
        Teacher.countDocuments(),
        Student.countDocuments(),
        Accountant.countDocuments(),
        Librarian.countDocuments(),
        Receptionist.countDocuments(),
        ViceAdmin.countDocuments(),
      ]);
      return res.json({
        success: true,
        data: {
          totalSchools,
          activeSchools: totalSchools,
          inactiveSchools: 0,
          totalTeachers,
          totalStudents,
          totalAccountants,
          totalLibrarians,
          totalReceptionists,
          totalViceAdmins,
          totalStaff: totalTeachers + totalAccountants + totalLibrarians + totalReceptionists + totalViceAdmins,
        },
      });
    } catch (error) {
      console.error("getDashboardStats:", error);
      return res.status(500).json({ success: false, message: "Error fetching stats", error: error.message });
    }
  },

  // ── Get All Schools ────────────────────────────────────────────────────────
  getAllSchools: async (req, res) => {
    try {
      const { search = "", page = 1, limit = 20 } = req.query;
      const safePage  = Math.max(parseInt(page,  10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const filter = {};
      if (search.trim()) {
        const rx = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ school_name: rx }, { email: rx }, { owner_name: rx }];
      }
      const [schools, total] = await Promise.all([
        School.find(filter).select("-password").sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
        School.countDocuments(filter),
      ]);
      return res.json({ success: true, data: schools, pagination: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) } });
    } catch (error) {
      console.error("getAllSchools:", error);
      return res.status(500).json({ success: false, message: "Error fetching schools", error: error.message });
    }
  },

  // ── Get School by ID ───────────────────────────────────────────────────────
  getSchoolById: async (req, res) => {
    try {
      const school = await School.findById(req.params.schoolId).select("-password");
      if (!school) return res.status(404).json({ success: false, message: "School not found" });
      return res.json({ success: true, data: school });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching school" });
    }
  },

  // ── Get School Staff (all roles for a school) ──────────────────────────────
  getSchoolStaff: async (req, res) => {
    try {
      const { schoolId } = req.params;
      const [teachers, accountants, librarians, receptionists, viceAdmins] = await Promise.all([
        Teacher.find({ school: schoolId }).select("-password").sort({ createdAt: -1 }),
        Accountant.find({ school: schoolId }).select("-password").sort({ createdAt: -1 }),
        Librarian.find({ school: schoolId }).select("-password").sort({ createdAt: -1 }),
        Receptionist.find({ school: schoolId }).select("-password").sort({ createdAt: -1 }),
        ViceAdmin.find({ school: schoolId }).select("-password").sort({ createdAt: -1 }),
      ]);
      return res.json({ success: true, data: { teachers, accountants, librarians, receptionists, viceAdmins } });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching school staff" });
    }
  },

  // ── Get School Students ────────────────────────────────────────────────────
  getSchoolStudents: async (req, res) => {
    try {
      const { schoolId } = req.params;
      const students = await Student.find({ school: schoolId }).select("-password").populate("student_class", "class_text").sort({ createdAt: -1 });
      return res.json({ success: true, data: students, total: students.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching students" });
    }
  },

  // ── Delete School ──────────────────────────────────────────────────────────
  deleteSchool: async (req, res) => {
    try {
      const { schoolId } = req.params;
      const school = await School.findByIdAndDelete(schoolId);
      if (!school) return res.status(404).json({ success: false, message: "School not found" });
      return res.json({ success: true, message: "School deleted successfully" });
    } catch (error) {
      console.error("deleteSchool:", error);
      return res.status(500).json({ success: false, message: "Error deleting school", error: error.message });
    }
  },

  // ── Toggle School Status ───────────────────────────────────────────────────
  toggleSchoolStatus: async (req, res) => {
    try {
      const { schoolId } = req.params;
      const school = await School.findById(schoolId);
      if (!school) return res.status(404).json({ success: false, message: "School not found" });
      school.status = school.status === "Active" ? "Inactive" : "Active";
      await school.save();
      return res.json({ success: true, message: `School status set to ${school.status}`, data: { status: school.status } });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error toggling school status" });
    }
  },
};
