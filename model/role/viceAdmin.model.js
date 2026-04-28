const mongoose = require("mongoose");

const viceAdminSchema = new mongoose.Schema(
  {
    school:        { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:      { type: String, required: true },
    phone:         { type: String, default: "", trim: true },
    address:       { type: String, default: "", trim: true },
    qualification: { type: String, default: "", trim: true },
    experience:    { type: String, default: "", trim: true },
    joining_date:  { type: Date, default: Date.now },
    salary:        { type: Number, default: 0 },
    vice_admin_image:          { type: String, default: "" },
    vice_admin_image_public_id:{ type: String, default: "" },

    // What the vice admin is allowed to manage
    permissions: {
      canManageStudents:   { type: Boolean, default: true },
      canManageTeachers:   { type: Boolean, default: true },
      canManageClasses:    { type: Boolean, default: true },
      canManageFees:       { type: Boolean, default: false },
      canManageAttendance: { type: Boolean, default: true },
      canManageExams:      { type: Boolean, default: true },
      canManageNotices:    { type: Boolean, default: true },
      canViewReports:      { type: Boolean, default: true },
    },

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ViceAdmin", viceAdminSchema);
