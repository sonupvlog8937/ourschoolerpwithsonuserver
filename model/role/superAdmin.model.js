const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  super_admin_image: { type: String, default: "" },
  permissions: {
    canManageSchools: { type: Boolean, default: true },
    canViewAllData: { type: Boolean, default: true },
    canDeleteSchools: { type: Boolean, default: true },
    canManageSubscriptions: { type: Boolean, default: true },
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
