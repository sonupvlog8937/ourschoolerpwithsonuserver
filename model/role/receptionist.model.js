const mongoose = require("mongoose");

const receptionistSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: "" },
  qualification: { type: String, default: "" },
  joining_date: { type: Date, default: Date.now },
  salary: { type: Number, default: 0 },
  receptionist_image: { type: String, default: "" },
  receptionist_image_public_id: { type: String },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Receptionist", receptionistSchema);
