const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  vehicle_number: { type: String, required: true, unique: true },
  vehicle_model: { type: String, required: true },
  vehicle_type: { type: String, default: "Bus" },
  capacity: { type: Number, required: true },
  driver_name: { type: String, required: true },
  driver_phone: { type: String, required: true },
  driver_license: { type: String, default: "" },
  route: { type: mongoose.Schema.ObjectId, ref: "TransportRoute" },
  insurance_expiry: { type: Date },
  fitness_expiry: { type: Date },
  status: { type: String, enum: ["Active", "Maintenance", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
