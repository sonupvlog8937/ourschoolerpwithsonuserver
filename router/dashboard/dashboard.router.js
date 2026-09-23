const express = require("express");
const authMiddleware = require("../../auth/auth");
const {
  getDashboardStats,
  refreshDashboardCache,
  getWeeklyAttendance,
  getTodayBirthdays,
  getUpcomingExams,
  getStaffDashboard,
  getStaffAttendance,
  getUpcomingEvents,
  getUpcomingHolidays,
  getRecentNotices,
  getAccountsDashboard,
  getFeeCollectionTrends,
  getRecentTransactions,
  getBankBalances,
  getIncomeExpenseData,
} = require("../../controller/dashboard/dashboard.controller");

const router = express.Router();

/**
 * Dashboard Routes for School Admin
 * All routes require SCHOOL authentication
 */

// ─── GET DASHBOARD STATISTICS ────────────────────────────────────────────────
/**
 * GET /api/dashboard/stats
 * Returns comprehensive dashboard statistics
 * Uses cache if available and fresh (5 min), otherwise computes fresh data
 */
router.get("/stats", authMiddleware(["SCHOOL"]), getDashboardStats);

// ─── REFRESH DASHBOARD CACHE ─────────────────────────────────────────────────
/**
 * POST /api/dashboard/refresh
 * Forces cache refresh and returns fresh data
 * Useful after bulk operations or data imports
 */
router.post("/refresh", authMiddleware(["SCHOOL"]), refreshDashboardCache);

// ─── GET WEEKLY ATTENDANCE ───────────────────────────────────────────────────
/**
 * GET /api/dashboard/weekly-attendance?days=7
 * Returns weekly attendance trends for chart visualization
 * Query params:
 *   - days: Number of days to fetch (default: 7)
 */
router.get(
  "/weekly-attendance",
  authMiddleware(["SCHOOL"]),
  getWeeklyAttendance
);

// ─── GET TODAY'S BIRTHDAYS ───────────────────────────────────────────────────
/**
 * GET /api/dashboard/birthdays
 * Returns list of students with birthdays today
 */
router.get("/birthdays", authMiddleware(["SCHOOL"]), getTodayBirthdays);

// ─── GET UPCOMING EXAMS ──────────────────────────────────────────────────────
/**
 * GET /api/dashboard/exams
 * Returns list of upcoming examinations (next 30 days)
 */
router.get("/exams", authMiddleware(["SCHOOL"]), getUpcomingExams);

// ═════════════════════════════════════════════════════════════════════════════
// STAFF DASHBOARD ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET STAFF DASHBOARD ─────────────────────────────────────────────────────
/**
 * GET /api/dashboard/staff-dashboard
 * Returns staff member's basic information
 * Auth: SCHOOL, TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST
 */
router.get(
  "/staff-dashboard",
  authMiddleware(["SCHOOL", "TEACHER", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"]),
  getStaffDashboard
);

// ─── GET STAFF ATTENDANCE ────────────────────────────────────────────────────
/**
 * GET /api/dashboard/staff-attendance
 * Returns current month attendance for logged-in staff member
 * Auth: SCHOOL, TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST
 */
router.get(
  "/staff-attendance",
  authMiddleware(["SCHOOL", "TEACHER", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"]),
  getStaffAttendance
);

// ─── GET UPCOMING EVENTS ─────────────────────────────────────────────────────
/**
 * GET /api/dashboard/upcoming-events
 * Returns list of upcoming school events
 * Auth: SCHOOL, TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST
 */
router.get(
  "/upcoming-events",
  authMiddleware(["SCHOOL", "TEACHER", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"]),
  getUpcomingEvents
);

// ─── GET UPCOMING HOLIDAYS ───────────────────────────────────────────────────
/**
 * GET /api/dashboard/upcoming-holidays
 * Returns list of upcoming holidays
 * Auth: SCHOOL, TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST
 */
router.get(
  "/upcoming-holidays",
  authMiddleware(["SCHOOL", "TEACHER", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"]),
  getUpcomingHolidays
);

// ─── GET RECENT NOTICES ──────────────────────────────────────────────────────
/**
 * GET /api/dashboard/recent-notices?limit=5
 * Returns recent notices/circulars
 * Auth: SCHOOL, TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST
 * Query params:
 *   - limit: Number of notices to fetch (default: 5)
 */
router.get(
  "/recent-notices",
  authMiddleware(["SCHOOL", "TEACHER", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"]),
  getRecentNotices
);

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNTS DASHBOARD ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ─── GET ACCOUNTS DASHBOARD ──────────────────────────────────────────────────
/**
 * GET /api/dashboard/accounts-dashboard
 * Returns financial overview including collections and pending fees
 * Auth: SCHOOL (for accountants and admins)
 */
router.get(
  "/accounts-dashboard",
  authMiddleware(["SCHOOL", "ACCOUNTANT"]),
  getAccountsDashboard
);

// ─── GET FEE COLLECTION TRENDS ───────────────────────────────────────────────
/**
 * GET /api/dashboard/fee-collection-trends?months=12
 * Returns monthly fee collection data for chart visualization
 * Auth: SCHOOL
 * Query params:
 *   - months: Number of months to fetch (default: 12)
 */
router.get(
  "/fee-collection-trends",
  authMiddleware(["SCHOOL", "ACCOUNTANT"]),
  getFeeCollectionTrends
);

// ─── GET RECENT TRANSACTIONS ─────────────────────────────────────────────────
/**
 * GET /api/dashboard/recent-transactions?limit=5
 * Returns recent fee payment transactions
 * Auth: SCHOOL
 * Query params:
 *   - limit: Number of transactions (default: 5)
 */
router.get(
  "/recent-transactions",
  authMiddleware(["SCHOOL", "ACCOUNTANT"]),
  getRecentTransactions
);

// ─── GET BANK BALANCES ───────────────────────────────────────────────────────
/**
 * GET /api/dashboard/bank-balances
 * Returns petty cash and bank account balances
 * Auth: SCHOOL
 */
router.get(
  "/bank-balances",
  authMiddleware(["SCHOOL", "ACCOUNTANT"]),
  getBankBalances
);

// ─── GET INCOME EXPENSE DATA ─────────────────────────────────────────────────
/**
 * GET /api/dashboard/income-expense
 * Returns income, expense, and balance data by time periods
 * Auth: SCHOOL, ACCOUNTANT
 */
router.get(
  "/income-expense",
  authMiddleware(["SCHOOL", "ACCOUNTANT"]),
  getIncomeExpenseData
);

module.exports = router;