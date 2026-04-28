require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Parent = require("../../model/role/parent.model");
const Student = require("../../model/role/student.model");

const jwtSecret = process.env.JWTSECRET;

module.exports = {
  // Register Parent
  registerParent: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, email, password, phone, address, occupation, relation, children } = req.body;

      const existingParent = await Parent.findOne({ email });
      if (existingParent) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const parent = new Parent({
        school: schoolId,
        name,
        email,
        password: hashedPassword,
        phone,
        address: address || "",
        occupation: occupation || "",
        relation: relation || "Father",
        children: children || [],
      });

      await parent.save();

      res.status(201).json({ success: true, message: "Parent registered successfully", data: parent });
    } catch (error) {
      console.error("Error registering parent:", error);
      res.status(500).json({ success: false, message: "Error registering parent", error: error.message });
    }
  },

  // Login Parent
  loginParent: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Support login via email OR username - check both @edusmart.com and @school.com
      let query;
      if (email && email.includes('@')) {
        query = { email };
      } else {
        query = {
          $or: [
            { email: `${email}@school.com` },
          ]
        };
      }

      const parent = await Parent.findOne(query)
        .populate("school", "school_name")
        .populate("children", "name roll_number student_class");
      
      console.log('Parent login attempt - email/username:', email, '| Query:', JSON.stringify(query), '| Found:', parent ? parent.email : 'NOT FOUND');
      
      if (!parent) {
        return res.status(404).json({ success: false, message: "Username or Email not found" });
      }

      if (parent.status === "Inactive") {
        return res.status(403).json({ success: false, message: "Account is inactive" });
      }

      const isPasswordValid = await bcrypt.compare(password, parent.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          id: parent._id,
          schoolId: parent.school._id,
          role: "PARENT",
          name: parent.name,
          email: parent.email,
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: parent._id,
          name: parent.name,
          email: parent.email,
          role: "PARENT",
          school_name: parent.school.school_name,
          children: parent.children,
          image_url: parent.parent_image,
        },
      });
    } catch (error) {
      console.error("Error logging in parent:", error);
      res.status(500).json({ success: false, message: "Error logging in", error: error.message });
    }
  },

  // Get all parents
  getAllParents: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const parents = await Parent.find({ school: schoolId }).populate("children", "name roll_number");
      res.status(200).json({ success: true, data: parents });
    } catch (error) {
      console.error("Error fetching parents:", error);
      res.status(500).json({ success: false, message: "Error fetching parents", error: error.message });
    }
  },

  // Get parent details
  getParentDetails: async (req, res) => {
    try {
      const parentId = req.user.id;
      const parent = await Parent.findById(parentId)
        .populate("school", "school_name")
        .populate({
          path: "children",
          populate: { path: "student_class", select: "class_text class_num" },
        });

      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent not found" });
      }

      res.status(200).json({ success: true, data: parent });
    } catch (error) {
      console.error("Error fetching parent details:", error);
      res.status(500).json({ success: false, message: "Error fetching details", error: error.message });
    }
  },

  // Update parent
  updateParent: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const parent = await Parent.findByIdAndUpdate(id, updates, { new: true });

      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent not found" });
      }

      res.status(200).json({ success: true, message: "Parent updated successfully", data: parent });
    } catch (error) {
      console.error("Error updating parent:", error);
      res.status(500).json({ success: false, message: "Error updating parent", error: error.message });
    }
  },

  // Delete parent
  deleteParent: async (req, res) => {
    try {
      const { id } = req.params;
      const parent = await Parent.findByIdAndDelete(id);

      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent not found" });
      }

      res.status(200).json({ success: true, message: "Parent deleted successfully" });
    } catch (error) {
      console.error("Error deleting parent:", error);
      res.status(500).json({ success: false, message: "Error deleting parent", error: error.message });
    }
  },

  // Link child to parent
  linkChild: async (req, res) => {
    try {
      const { parentId, studentId } = req.body;

      const parent = await Parent.findById(parentId);
      if (!parent) {
        return res.status(404).json({ success: false, message: "Parent not found" });
      }

      if (!parent.children.includes(studentId)) {
        parent.children.push(studentId);
        await parent.save();
      }

      res.status(200).json({ success: true, message: "Child linked successfully", data: parent });
    } catch (error) {
      console.error("Error linking child:", error);
      res.status(500).json({ success: false, message: "Error linking child", error: error.message });
    }
  },
};
