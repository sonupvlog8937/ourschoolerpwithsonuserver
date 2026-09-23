const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/auth');
const { createPeriod, getPeriods, updatePeriod, deletePeriod, getPeriodsWithId } = require('../controller/period.controller');

router.post('/create', authMiddleware(['SCHOOL']), createPeriod);
router.get('/all', authMiddleware(['SCHOOL']), getPeriods);
router.get('/:id', authMiddleware(['SCHOOL']), getPeriodsWithId);
router.put('/update/:id', authMiddleware(['SCHOOL']), updatePeriod);
router.delete('/delete/:id', authMiddleware(['SCHOOL']), deletePeriod);

module.exports = router;
