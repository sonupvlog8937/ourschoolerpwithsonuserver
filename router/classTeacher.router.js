const express = require("express");
const router = express.Router();
const authMiddleware = require('../auth/auth');
const { 
    getAllClassTeacher, 
    createClassTeacher, 
    getClassTeacherWithId, 
    updateClassTeacherWithId, 
    deleteClassTeacherWithId,
    getClasses,
    getTeachers,
    getSections
} = require("../controller/classTeacher.controller");

router.get("/fetch-all", authMiddleware(['SCHOOL']), getAllClassTeacher);
router.post("/create", authMiddleware(['SCHOOL']), createClassTeacher);
router.get("/fetch-single/:id", authMiddleware(['SCHOOL']), getClassTeacherWithId);
router.patch("/update/:id", authMiddleware(['SCHOOL']), updateClassTeacherWithId);
router.delete("/delete/:id", authMiddleware(['SCHOOL']), deleteClassTeacherWithId);
router.get("/classes", authMiddleware(['SCHOOL']), getClasses);
router.get("/teachers", authMiddleware(['SCHOOL']), getTeachers);
router.get("/sections", authMiddleware(['SCHOOL']), getSections);

module.exports = router;