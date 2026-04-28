const TransportRoute = require("../model/transport.model");
const Vehicle = require("../model/vehicle.model");
const mongoose = require("mongoose");

module.exports = {
  // Create transport route
  createRoute: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const routeData = { ...req.body, school: schoolId };

      const route = new TransportRoute(routeData);
      await route.save();

      res.status(201).json({ success: true, message: "Route created successfully", data: route });
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ success: false, message: "Error creating route", error: error.message });
    }
  },

  // Get all routes
  getAllRoutes: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status } = req.query;

      const filter = { school: schoolId };
      if (status) filter.status = status;

      const routes = await TransportRoute.find(filter).sort({ route_number: 1 });

      res.status(200).json({ success: true, data: routes });
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ success: false, message: "Error fetching routes", error: error.message });
    }
  },

  // Get route by ID
  getRouteById: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await TransportRoute.findById(id);

      if (!route) {
        return res.status(404).json({ success: false, message: "Route not found" });
      }

      res.status(200).json({ success: true, data: route });
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ success: false, message: "Error fetching route", error: error.message });
    }
  },

  // Update route
  updateRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const route = await TransportRoute.findByIdAndUpdate(id, updates, { new: true });

      if (!route) {
        return res.status(404).json({ success: false, message: "Route not found" });
      }

      res.status(200).json({ success: true, message: "Route updated successfully", data: route });
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ success: false, message: "Error updating route", error: error.message });
    }
  },

  // Delete route
  deleteRoute: async (req, res) => {
    try {
      const { id } = req.params;
      const route = await TransportRoute.findByIdAndDelete(id);

      if (!route) {
        return res.status(404).json({ success: false, message: "Route not found" });
      }

      res.status(200).json({ success: true, message: "Route deleted successfully" });
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ success: false, message: "Error deleting route", error: error.message });
    }
  },

  // Create vehicle
  createVehicle: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const vehicleData = { ...req.body, school: schoolId };

      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();

      res.status(201).json({ success: true, message: "Vehicle created successfully", data: vehicle });
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ success: false, message: "Error creating vehicle", error: error.message });
    }
  },

  // Get all vehicles
  getAllVehicles: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status, routeId } = req.query;

      const filter = { school: schoolId };
      if (status) filter.status = status;
      if (routeId) filter.route = routeId;

      const vehicles = await Vehicle.find(filter).populate("route", "route_name route_number").sort({ vehicle_number: 1 });

      res.status(200).json({ success: true, data: vehicles });
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ success: false, message: "Error fetching vehicles", error: error.message });
    }
  },

  // Get vehicle by ID
  getVehicleById: async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await Vehicle.findById(id).populate("route", "route_name route_number");

      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" });
      }

      res.status(200).json({ success: true, data: vehicle });
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ success: false, message: "Error fetching vehicle", error: error.message });
    }
  },

  // Update vehicle
  updateVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const vehicle = await Vehicle.findByIdAndUpdate(id, updates, { new: true });

      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" });
      }

      res.status(200).json({ success: true, message: "Vehicle updated successfully", data: vehicle });
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ success: false, message: "Error updating vehicle", error: error.message });
    }
  },

  // Delete vehicle
  deleteVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await Vehicle.findByIdAndDelete(id);

      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" });
      }

      res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ success: false, message: "Error deleting vehicle", error: error.message });
    }
  },
};
