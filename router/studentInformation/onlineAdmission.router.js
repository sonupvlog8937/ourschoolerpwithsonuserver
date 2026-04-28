const express = require('express');
const authMiddleware = require('../../auth/auth');
const {
  getOnlineAdmissions,
  getOnlineAdmissionById,
  approveOnlineAdmission,
  rejectOnlineAdmission,
} = require('../../controller/studentInformation/studentAdmission.controller');

const router = express.Router();

router.get('/', authMiddleware(['SCHOOL']), getOnlineAdmissions);
router.get('/:id', authMiddleware(['SCHOOL']), getOnlineAdmissionById);
router.put('/:id/approve', authMiddleware(['SCHOOL']), approveOnlineAdmission);
router.put('/:id/reject', authMiddleware(['SCHOOL']), rejectOnlineAdmission);

module.exports = router;
