require("dotenv").config();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const ViceAdmin = require("../../model/role/viceAdmin.model");
const School    = require("../../model/role/school.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  // ── Register (School admin creates a vice admin) ───────────────────────────
  registerViceAdmin: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, email, password, phone, address, qualification, experience, salary, permissions } = req.body;

      if (!name?.trim())  return res.status(400).json({ success: false, message: "Name is required" });
      if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });
      if (!password)      return res.status(400).json({ success: false, message: "Password is required" });

      const existing = await ViceAdmin.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(400).json({ success: false, message: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      const viceAdmin = await ViceAdmin.create({
        school:        schoolId,
        name:          name.trim(),
        email:         email.toLowerCase().trim(),
        password:      hashedPassword,
        phone:         phone         || "",
        address:       address       || "",
        qualification: qualification || "",
        experience:    experience    || "",
        salary:        salary        || 0,
        permissions:   permissions   || {},
      });

      const { password: _, ...safeData } = viceAdmin.toObject();
      return res.status(201).json({ success: true, message: "Vice Admin registered successfully", data: safeData });
    } catch (err) {
      console.error("registerViceAdmin:", err);
      return res.status(500).json({ success: false, message: "Unable to register Vice Admin" });
    }
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  loginViceAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ success: false, message: "Email and password are required" });

      const viceAdmin = await ViceAdmin.findOne({ email: email.toLowerCase().trim() }).populate("school", "school_name");
      if (!viceAdmin)
        return res.status(404).json({ success: false, message: "Vice Admin not found" });

      if (viceAdmin.status === "Inactive")
        return res.status(403).json({ success: false, message: "Account is inactive. Contact school admin." });

      const isValid = await bcrypt.compare(password, viceAdmin.password);
      if (!isValid)
        return res.status(401).json({ success: false, message: "Invalid credentials" });

      const token = jwt.sign(
        {
          id:          viceAdmin._id,
          schoolId:    viceAdmin.school._id,
          role:        "VICEADMIN",
          name:        viceAdmin.name,
          email:       viceAdmin.email,
          permissions: viceAdmin.permissions,
          school_name: viceAdmin.school.school_name,
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id:          viceAdmin._id,
          name:        viceAdmin.name,
          email:       viceAdmin.email,
          role:        "VICEADMIN",
          school_name: viceAdmin.school.school_name,
          image_url:   viceAdmin.vice_admin_image,
          permissions: viceAdmin.permissions,
        },
      });
    } catch (err) {
      console.error("loginViceAdmin:", err);
      return res.status(500).json({ success: false, message: "Login failed" });
    }
  },

  // ── Get own details (for logged-in vice admin) ─────────────────────────────
  getMyDetails: async (req, res) => {
    try {
      const viceAdmin = await ViceAdmin.findById(req.user.id)
        .populate("school", "school_name school_image")
        .select("-password");
      if (!viceAdmin) return res.status(404).json({ success: false, message: "Vice Admin not found" });
      return res.json({ success: true, data: viceAdmin });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch details" });
    }
  },

  // ── Get all vice admins for a school ──────────────────────────────────────
  getAllViceAdmins: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status, search, page = 1, limit = 20 } = req.query;

      const filter = { school: schoolId };
      if (status && status !== "all") filter.status = status;
      if (search?.trim()) {
        const rx = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
      }

      const safePage  = Math.max(parseInt(page,  10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

      const [viceAdmins, total] = await Promise.all([
        ViceAdmin.find(filter).select("-password").sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
        ViceAdmin.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: viceAdmins,
        pagination: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch vice admins" });
    }
  },

  // ── Get single by ID ───────────────────────────────────────────────────────
  getViceAdminById: async (req, res) => {
    try {
      const viceAdmin = await ViceAdmin.findOne({ _id: req.params.id, school: req.user.schoolId })
        .populate("school", "school_name")
        .select("-password");
      if (!viceAdmin) return res.status(404).json({ success: false, message: "Vice Admin not found" });
      return res.json({ success: true, data: viceAdmin });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch vice admin" });
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  updateViceAdmin: async (req, res) => {
    try {
      const updates = { ...req.body };
      delete updates.email;   // email change not allowed via this endpoint
      delete updates.school;  // school change not allowed

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const viceAdmin = await ViceAdmin.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        updates,
        { new: true }
      ).select("-password");

      if (!viceAdmin) return res.status(404).json({ success: false, message: "Vice Admin not found" });
      return res.json({ success: true, message: "Vice Admin updated successfully", data: viceAdmin });
    } catch (err) {
      console.error("updateViceAdmin:", err);
      return res.status(500).json({ success: false, message: "Unable to update Vice Admin" });
    }
  },

  // ── Update permissions ─────────────────────────────────────────────────────
  updatePermissions: async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!permissions || typeof permissions !== "object")
        return res.status(400).json({ success: false, message: "Permissions object required" });

      const viceAdmin = await ViceAdmin.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        { permissions },
        { new: true }
      ).select("-password");

      if (!viceAdmin) return res.status(404).json({ success: false, message: "Vice Admin not found" });
      return res.json({ success: true, message: "Permissions updated", data: viceAdmin });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to update permissions" });
    }
  },

  // ── Toggle status ──────────────────────────────────────────────────────────
  toggleStatus: async (req, res) => {
    try {
      const viceAdmin = await ViceAdmin.findOne({ _id: req.params.id, school: req.user.schoolId });
      if (!viceAdmin) return res.status(404).json({ success: false, message: "Vice Admin not found" });

      viceAdmin.status = viceAdmin.status === "Active" ? "Inactive" : "Active";
      await viceAdmin.save();

      return res.json({ success: true, message: `Status set to ${viceAdmin.status}`, data: { status: viceAdmin.status } });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to toggle status" });
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteViceAdmin: async (req, res) => {
    try {
      const deleted = await ViceAdmin.findOneAndDelete({ _id: req.params.id, school: req.user.schoolId });
      if (!deleted) return res.status(404).json({ success: false, message: "Vice Admin not found" });
      return res.json({ success: true, message: "Vice Admin deleted successfully" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete Vice Admin" });
    }
  },
};
