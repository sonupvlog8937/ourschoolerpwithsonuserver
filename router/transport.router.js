const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const transportController = require("../controller/transport.controller");

// Route routes
router.post("/route/create", authMiddleware(["SCHOOL"]), transportController.createRoute);
router.get("/route/all", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), transportController.getAllRoutes);
router.get("/route/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), transportController.getRouteById);
router.put("/route/:id", authMiddleware(["SCHOOL"]), transportController.updateRoute);
router.delete("/route/:id", authMiddleware(["SCHOOL"]), transportController.deleteRoute);

// Vehicle routes
router.post("/vehicle/create", authMiddleware(["SCHOOL"]), transportController.createVehicle);
router.get("/vehicle/all", authMiddleware(["SCHOOL", "TEACHER"]), transportController.getAllVehicles);
router.get("/vehicle/:id", authMiddleware(["SCHOOL", "TEACHER"]), transportController.getVehicleById);
router.put("/vehicle/:id", authMiddleware(["SCHOOL"]), transportController.updateVehicle);
router.delete("/vehicle/:id", authMiddleware(["SCHOOL"]), transportController.deleteVehicle);

module.exports = router;
