const express = require('express');
const router = express.Router();
const {
  createFeeDiscount,
  getFeeDiscounts,
  getFeeDiscountById,
  updateFeeDiscount,
  deleteFeeDiscount,
  getActiveDiscounts,
  calculateDiscount
} = require('../../controller/feeCollections/feeDiscount.controller');
const authMiddleware = require('../../auth/auth');

// Routes accessible by school admin and accountant
router.route('/')
  .get(authMiddleware(['SCHOOL', 'ACCOUNTANT']), getFeeDiscounts)
  .post(authMiddleware(['SCHOOL', 'ACCOUNTANT']), createFeeDiscount);

router.get('/active/list', authMiddleware(['SCHOOL', 'ACCOUNTANT']), getActiveDiscounts);
router.post('/calculate', authMiddleware(['SCHOOL', 'ACCOUNTANT']), calculateDiscount);

router.route('/:id')
  .get(authMiddleware(['SCHOOL', 'ACCOUNTANT']), getFeeDiscountById)
  .put(authMiddleware(['SCHOOL', 'ACCOUNTANT']), updateFeeDiscount)
  .delete(authMiddleware(['SCHOOL', 'ACCOUNTANT']), deleteFeeDiscount);

module.exports = router;
