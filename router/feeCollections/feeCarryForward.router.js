const express = require('express');
const router = express.Router();
const feeCarryForwardController = require('../../controller/feeCollections/feeCarryForward.controller');
const authMiddleware = require('../../auth/auth');

// All routes require SCHOOL authentication
router.get('/pending-students', authMiddleware(['SCHOOL']), feeCarryForwardController.getPendingStudents);
router.get('/summary', authMiddleware(['SCHOOL']), feeCarryForwardController.getCarryForwardSummary);
router.post('/create', authMiddleware(['SCHOOL']), feeCarryForwardController.createCarryForward);
router.post('/process', authMiddleware(['SCHOOL']), feeCarryForwardController.processCarryForward);
router.put('/update-balance/:studentId', authMiddleware(['SCHOOL']), feeCarryForwardController.updateStudentBalance);

router.route('/')
  .get(authMiddleware(['SCHOOL']), feeCarryForwardController.getCarryForwardRecords);

router.route('/:id')
  .put(authMiddleware(['SCHOOL']), feeCarryForwardController.updateCarryForward)
  .delete(authMiddleware(['SCHOOL']), feeCarryForwardController.deleteCarryForward);

module.exports = router;
