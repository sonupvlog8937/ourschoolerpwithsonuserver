const express = require('express');
const authMiddleware = require('../../auth/auth');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  getDropdownOptions,
  changePassword,
  generateLogin,
  bulkDeleteStudents,
  updateAdditionalClasses,
  getOnlineAdmissions,
  approveOnlineAdmission,
  rejectOnlineAdmission,
  getDisabledStudents,
  disableStudent,
  enableStudent,
} = require('../../controller/studentInformation/studentAdmission.controller');

const router = express.Router();

router.get('/all', authMiddleware(['SCHOOL']), getStudents);
router.get('/stats', authMiddleware(['SCHOOL']), getStudentStats);
router.get('/dropdown-options', authMiddleware(['SCHOOL']), getDropdownOptions);
router.get('/dropdown-options-public', getDropdownOptions); // Public route for online admission
router.get('/disabled', authMiddleware(['SCHOOL']), getDisabledStudents);
router.get('/:id', authMiddleware(['SCHOOL']), getStudentById);
router.post('/add', authMiddleware(['SCHOOL']), createStudent);
router.post('/bulk-delete', authMiddleware(['SCHOOL']), bulkDeleteStudents);
router.post('/:id/generate-login', authMiddleware(['SCHOOL']), generateLogin);
router.put('/:id', authMiddleware(['SCHOOL']), updateStudent);
router.put('/:id/additional-classes', authMiddleware(['SCHOOL']), updateAdditionalClasses);
router.put('/:id/change-password', authMiddleware(['SCHOOL']), changePassword);
router.put('/:id/disable', authMiddleware(['SCHOOL']), disableStudent);
router.put('/:id/enable', authMiddleware(['SCHOOL']), enableStudent);
router.delete('/:id', authMiddleware(['SCHOOL']), deleteStudent);

module.exports = router;
