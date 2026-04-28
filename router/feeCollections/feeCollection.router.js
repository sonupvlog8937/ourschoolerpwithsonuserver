const express = require('express');
const router = express.Router();
const feeCollectionController = require('../../controller/feeCollections/feeCollection.controller');
const authMiddleware = require('../../auth/auth');

// Fee Collection Routes (All routes require SCHOOL authentication)
router.get('/search-students', authMiddleware(['SCHOOL']), feeCollectionController.searchStudentsForFee);
router.get('/student/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.getStudentFeeDetails);
router.get('/student-fees/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.getStudentFeesForCollection);
router.post('/collect/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.collectFee);
router.get('/receipts/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.getStudentReceipts);
router.get('/classes', authMiddleware(['SCHOOL']), feeCollectionController.getAllClasses);
router.get('/demand-bills', authMiddleware(['SCHOOL']), feeCollectionController.getDemandBills);
router.get('/fee-groups', authMiddleware(['SCHOOL']), feeCollectionController.getFeeGroups);
router.get('/offline-bank-payments', authMiddleware(['SCHOOL']), feeCollectionController.getOfflineBankPayments);
router.post('/offline-bank-payment', authMiddleware(['SCHOOL']), feeCollectionController.createOfflineBankPayment);
router.put('/offline-bank-payment/:paymentId/status', authMiddleware(['SCHOOL']), feeCollectionController.updateOfflineBankPaymentStatus);
router.get('/search-payments', authMiddleware(['SCHOOL']), feeCollectionController.searchFeePayments);
router.get('/payment/:paymentId', authMiddleware(['SCHOOL']), feeCollectionController.getPaymentDetails);
router.get('/search-due-fees', authMiddleware(['SCHOOL']), feeCollectionController.searchDueFees);
router.get('/demand-bill/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.getStudentDemandBill);

// Fee Master Routes
router.get('/fee-masters', authMiddleware(['SCHOOL']), feeCollectionController.getAllFeeMasters);
router.post('/fee-master', authMiddleware(['SCHOOL']), feeCollectionController.createFeeMaster);
router.get('/fee-master/:feeMasterId', authMiddleware(['SCHOOL']), feeCollectionController.getFeeMasterById);
router.put('/fee-master/:feeMasterId', authMiddleware(['SCHOOL']), feeCollectionController.updateFeeMaster);
router.delete('/fee-master/:feeMasterId', authMiddleware(['SCHOOL']), feeCollectionController.deleteFeeMaster);

// Fee Group Routes
router.get('/fee-groups-paginated', authMiddleware(['SCHOOL']), feeCollectionController.getAllFeeGroupsWithPagination);
router.post('/fee-group', authMiddleware(['SCHOOL']), feeCollectionController.createFeeGroup);
router.get('/fee-group/:feeGroupId', authMiddleware(['SCHOOL']), feeCollectionController.getFeeGroupById);
router.put('/fee-group/:feeGroupId', authMiddleware(['SCHOOL']), feeCollectionController.updateFeeGroup);
router.delete('/fee-group/:feeGroupId', authMiddleware(['SCHOOL']), feeCollectionController.deleteFeeGroup);

// Fee Type Routes
router.get('/fee-types-paginated', authMiddleware(['SCHOOL']), feeCollectionController.getAllFeeTypesWithPagination);
router.post('/fee-type', authMiddleware(['SCHOOL']), feeCollectionController.createFeeType);
router.get('/fee-type/:feeTypeId', authMiddleware(['SCHOOL']), feeCollectionController.getFeeTypeById);
router.put('/fee-type/:feeTypeId', authMiddleware(['SCHOOL']), feeCollectionController.updateFeeType);
router.delete('/fee-type/:feeTypeId', authMiddleware(['SCHOOL']), feeCollectionController.deleteFeeType);

// New Fee Payment Routes
router.post('/collect-single-fee/:feeAssignmentId', authMiddleware(['SCHOOL']), feeCollectionController.collectSingleFee);
router.post('/collect-multiple-fees', authMiddleware(['SCHOOL']), feeCollectionController.collectMultipleFees);
router.get('/fee-assignment-payments/:feeAssignmentId', authMiddleware(['SCHOOL']), feeCollectionController.getFeeAssignmentPayments);
router.get('/student-receipts/:studentId', authMiddleware(['SCHOOL']), feeCollectionController.getStudentAllReceipts);
router.get('/receipt/:receiptId', authMiddleware(['SCHOOL']), feeCollectionController.getReceiptDetails);
router.delete('/revert-payment/:paymentId', authMiddleware(['SCHOOL']), feeCollectionController.revertPayment);
router.get('/discount-groups', authMiddleware(['SCHOOL']), feeCollectionController.getDiscountGroups);

// Fee Assignment Route
router.post('/assign-fee', authMiddleware(['SCHOOL']), feeCollectionController.assignFeeToStudents);

module.exports = router;
