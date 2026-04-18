const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  checkAttendance,
  getSchoolAttendanceOverview,
  getTeacherClassAttendanceOverview,
} = require('../controller/attendance.controller');
const authMiddleware = require('../auth/auth')
// Mark attendance
router.post('/mark',authMiddleware(['TEACHER']) , markAttendance);
router.get('/school/overview', authMiddleware(['SCHOOL']), getSchoolAttendanceOverview);
router.get('/class/:classId/overview', authMiddleware(['TEACHER', 'SCHOOL']), getTeacherClassAttendanceOverview);
router.get('/check/:classId', authMiddleware(['TEACHER']), checkAttendance)
router.get('/:studentId',authMiddleware(['TEACHER', 'STUDENT','SCHOOL']),  getAttendance);
module.exports = router;
