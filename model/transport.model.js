const mongoose = require("mongoose");

const transportRouteSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  route_name: { type: String, required: true },
  route_number: { type: String, required: true },
  start_point: { type: String, required: true },
  end_point: { type: String, required: true },
  stops: [{ type: String }],
  fare: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TransportRoute", transportRouteSchema);
