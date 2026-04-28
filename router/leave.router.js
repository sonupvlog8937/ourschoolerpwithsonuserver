const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const leaveController = require("../controller/leave.controller");

// Leave routes
router.post("/apply", authMiddleware(["TEACHER", "STUDENT"]), leaveController.applyLeave);
router.get("/all", authMiddleware(["SCHOOL", "TEACHER"]), leaveController.getAllLeaves);
router.get("/my", authMiddleware(["TEACHER", "STUDENT"]), leaveController.getMyLeaves);
router.get("/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), leaveController.getLeaveById);
router.put("/:id/status", authMiddleware(["SCHOOL", "TEACHER"]), leaveController.updateLeaveStatus);
router.delete("/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), leaveController.deleteLeave);
router.get("/summary/all", authMiddleware(["SCHOOL"]), leaveController.getLeaveSummary);

module.exports = router;
