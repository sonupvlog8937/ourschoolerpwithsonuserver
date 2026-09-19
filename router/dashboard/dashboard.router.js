const express = require("express");
const authMiddleware = require("../../auth/auth");
const {
  getDashboardStats,
  refreshDashboardCache,
  getWeeklyAttendance,
  getTodayBirthdays,
  getUpcomingExams,
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

module.exports = router;
