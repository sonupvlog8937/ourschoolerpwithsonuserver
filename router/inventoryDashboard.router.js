const express = require('express');
const router = express.Router();
const inventoryDashboardController = require('../controller/inventory/inventoryDashboard.controller');
const authMiddleware = require('../auth/auth');

// Get inventory dashboard stats
router.get(
  '/dashboard/:schoolId',
  authMiddleware(['SCHOOL']),
  inventoryDashboardController.getInventoryDashboard
);

// Get low stock items
router.get(
  '/low-stock/:schoolId',
  authMiddleware(['SCHOOL']),
  inventoryDashboardController.getLowStockItems
);

// Get recent transactions
router.get(
  '/recent-transactions/:schoolId',
  authMiddleware(['SCHOOL']),
  inventoryDashboardController.getRecentTransactions
);

module.exports = router;
