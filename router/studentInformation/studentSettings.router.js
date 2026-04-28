const express = require('express');
const authMiddleware = require('../../auth/auth');
const {
  getCategories, createCategory, updateCategory, deleteCategory,
  getHouses, createHouse, updateHouse, deleteHouse,
  getDisableReasons, createDisableReason, updateDisableReason, deleteDisableReason,
  getBulkDeleteStatus, getMultiClassStatus, updateBulkDeleteStatus, updateMultiClassStatus,
} = require('../../controller/studentInformation/studentSettings.controller');

const router = express.Router();

// Categories
router.get('/categories', authMiddleware(['SCHOOL']), getCategories);
router.post('/categories', authMiddleware(['SCHOOL']), createCategory);
router.put('/categories/:id', authMiddleware(['SCHOOL']), updateCategory);
router.delete('/categories/:id', authMiddleware(['SCHOOL']), deleteCategory);

// Houses
router.get('/houses', authMiddleware(['SCHOOL']), getHouses);
router.post('/houses', authMiddleware(['SCHOOL']), createHouse);
router.put('/houses/:id', authMiddleware(['SCHOOL']), updateHouse);
router.delete('/houses/:id', authMiddleware(['SCHOOL']), deleteHouse);

// Disable Reasons
router.get('/disable-reasons', authMiddleware(['SCHOOL']), getDisableReasons);
router.post('/disable-reasons', authMiddleware(['SCHOOL']), createDisableReason);
router.put('/disable-reasons/:id', authMiddleware(['SCHOOL']), updateDisableReason);
router.delete('/disable-reasons/:id', authMiddleware(['SCHOOL']), deleteDisableReason);

// School Settings
router.get('/bulk-delete-status', authMiddleware(['SCHOOL']), getBulkDeleteStatus);
router.get('/multi-class-status', authMiddleware(['SCHOOL']), getMultiClassStatus);
router.put('/bulk-delete-status', authMiddleware(['SCHOOL']), updateBulkDeleteStatus);
router.put('/multi-class-status', authMiddleware(['SCHOOL']), updateMultiClassStatus);

module.exports = router;
