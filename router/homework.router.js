const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const homeworkController = require("../controller/homework.controller");

// Homework routes
router.post("/create", authMiddleware(["SCHOOL", "TEACHER"]), homeworkController.createHomework);
router.get("/all", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), homeworkController.getAllHomework);
router.get("/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), homeworkController.getHomeworkById);
router.put("/:id", authMiddleware(["SCHOOL", "TEACHER"]), homeworkController.updateHomework);
router.delete("/:id", authMiddleware(["SCHOOL", "TEACHER"]), homeworkController.deleteHomework);

// Submission routes
router.post("/submit", authMiddleware(["STUDENT"]), homeworkController.submitHomework);
router.get("/:homeworkId/submissions", authMiddleware(["SCHOOL", "TEACHER"]), homeworkController.getHomeworkSubmissions);
router.put("/submission/:submissionId/evaluate", authMiddleware(["SCHOOL", "TEACHER"]), homeworkController.evaluateHomework);

module.exports = router;
