const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: "" },
  occupation: { type: String, default: "" },
  children: [{ type: mongoose.Schema.ObjectId, ref: "Student" }], // Multiple children
  parent_image: { type: String, default: "" },
  parent_image_public_id: { type: String },
  relation: { type: String, enum: ["Father", "Mother", "Guardian"], default: "Father" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Parent", parentSchema);
