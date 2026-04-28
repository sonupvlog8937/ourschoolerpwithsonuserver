const express = require("express");
const router = express.Router();
const authMiddleware = require("../../auth/auth");
const visitorBookController = require("../../controller/frontOffice/visitorBook.controller");

// Visitor routes
router.post("/add", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.addVisitor);
router.get("/all", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.getAllVisitors);
router.get("/today", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.getTodayVisitors);
router.get("/currently-in", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.getCurrentlyInVisitors);
router.get("/stats", authMiddleware(["SCHOOL"]), visitorBookController.getVisitorStats);
router.get("/:id", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.getVisitorById);
router.put("/:id", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.updateVisitor);
router.put("/:id/checkout", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.markVisitorOut);
router.post("/bulk-checkout", authMiddleware(["SCHOOL", "TEACHER"]), visitorBookController.bulkCheckOut);
router.delete("/:id", authMiddleware(["SCHOOL"]), visitorBookController.deleteVisitor);

module.exports = router;
