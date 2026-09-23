const express = require('express');
const router = express.Router();
const feeAssignmentController = require('../controller/feeCollections/feeAssignment.controller');
const authMiddleware = require('../auth/auth');

// Get fee assignment dashboard data
router.get(
  '/dashboard/:schoolId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.getFeeAssignmentDashboard
);

// Get students with fee status
router.get(
  '/students/:schoolId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.getStudentsWithFeeStatus
);

// Get fee groups for school
router.get(
  '/fee-groups/:schoolId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.getFeeGroups
);

// Assign fee to students
router.post(
  '/assign/:schoolId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.assignFeeToStudents
);

// Update fee assignment
router.put(
  '/:assignmentId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.updateFeeAssignment
);

// Delete fee assignment
router.delete(
  '/:assignmentId',
  authMiddleware(['SCHOOL']),
  feeAssignmentController.deleteFeeAssignment
);

module.exports = router;
