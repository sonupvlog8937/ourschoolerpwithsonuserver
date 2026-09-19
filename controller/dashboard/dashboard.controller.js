const mongoose = require("mongoose");

// Import Models
const Dashboard = require("../../model/dashboard/dashboard.model");
const StudentAdmission = require("../../model/studentInformation/studentAdmission.model");
const Teacher = require("../../model/role/teacher.model");
const Attendance = require("../../model/attendance.model");
const FeePayment = require("../../model/feeCollections/feePayment.model");
const FeeCollection = require("../../model/feeCollections/feeCollection.model");
const Complaint = require("../../model/frontOffice/complaint.model");
const LibraryBook = require("../../model/library.model");
const TransportRoute = require("../../model/transport.model");
const Leave = require("../../model/leave.model");
const BookIssue = require("../../model/bookIssue.model");
const Examination = require("../../model/examination.model");

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

module.exports = {
  /**
   * Get Dashboard Statistics
   * Returns comprehensive dashboard data for school admin
   * Uses cache if available and fresh, otherwise computes fresh data
   */
  getDashboardStats: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      // Check if cached data exists and is fresh
      const cachedData = await Dashboard.findOne({ school: schoolId });
      const now = Date.now();

      if (cachedData && now - cachedData.lastUpdated.getTime() < CACHE_DURATION) {
        // Return cached data
        return res.status(200).json({
          success: true,
          data: formatDashboardResponse(cachedData),
          cached: true,
          lastUpdated: cachedData.lastUpdated,
        });
      }

      // Compute fresh data
      const dashboardData = await computeDashboardStats(schoolId);

      // Update or create cache
      await Dashboard.findOneAndUpdate(
        { school: schoolId },
        {
          ...dashboardData,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      // Return computed data
      res.status(200).json({
        success: true,
        data: formatDashboardResponse(dashboardData),
        cached: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Dashboard Stats. Try later",
      });
    }
  },

  /**
   * Refresh Dashboard Cache
   * Manually triggers cache refresh and returns fresh data
   */
  refreshDashboardCache: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      // Compute fresh data
      const dashboardData = await computeDashboardStats(schoolId);

      // Update cache
      const updatedCache = await Dashboard.findOneAndUpdate(
        { school: schoolId },
        {
          ...dashboardData,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      res.status(200).json({
        success: true,
        message: "Dashboard cache refreshed successfully",
        data: formatDashboardResponse(updatedCache),
      });
    } catch (error) {
      console.error("Error in refreshDashboardCache:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Refreshing Dashboard Cache. Try later",
      });
    }
  },

  /**
   * Get Weekly Attendance Trends
   * Returns last 7 days attendance data for chart
   */
  getWeeklyAttendance: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const days = parseInt(req.query.days) || 7;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const attendanceTrends = await Attendance.aggregate([
        {
          $match: {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            present: {
              $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
            },
            absent: {
              $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.status(200).json({
        success: true,
        data: attendanceTrends,
      });
    } catch (error) {
      console.error("Error in getWeeklyAttendance:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Weekly Attendance. Try later",
      });
    }
  },

  /**
   * Get Today's Birthdays
   * Returns list of students with birthdays today
   */
  getTodayBirthdays: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();

      const birthdays = await StudentAdmission.find({
        school: schoolId,
        status: "Active",
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: "$dateOfBirth" }, today.getDate()] },
            { $eq: [{ $month: "$dateOfBirth" }, today.getMonth() + 1] },
          ],
        },
      })
        .populate("class", "name")
        .select("firstName lastName photo class")
        .limit(10);

      res.status(200).json({
        success: true,
        data: birthdays,
      });
    } catch (error) {
      console.error("Error in getTodayBirthdays:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Today's Birthdays. Try later",
      });
    }
  },

  /**
   * Get Upcoming Exams
   * Returns list of upcoming examinations
   */
  getUpcomingExams: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30); // Next 30 days

      const exams = await Examination.find({
        school: schoolId,
        exam_date: { $gte: today, $lte: futureDate },
      })
        .populate("class", "name")
        .populate("subject", "name")
        .select("exam_name exam_date class subject")
        .sort({ exam_date: 1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: exams,
      });
    } catch (error) {
      console.error("Error in getUpcomingExams:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Upcoming Exams. Try later",
      });
    }
  },
};

/**
 * Helper function to compute dashboard statistics
 * Aggregates data from various models
 */
async function computeDashboardStats(schoolId) {
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Last 7 days for weekly attendance
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);

  // Parallel data fetching for better performance
  const [
    totalStudents,
    totalTeachers,
    todayAttendance,
    totalAttendanceRecords,
    todayPayments,
    feeDueStudents,
    newAdmissions,
    complaints,
    openComplaints,
    libraryBooks,
    issuedBooks,
    transportRoutes,
    studentsWithTransport,
    genderCounts,
    staffLeaves,
    birthdaysToday,
    totalFeeData,
    weeklyAttendanceData,
    upcomingExamsCount,
    complaintsByStatus,
    complaintsByPriority,
  ] = await Promise.all([
    // Total students
    StudentAdmission.countDocuments({ school: schoolId, status: "Active" }),

    // Total teachers
    Teacher.countDocuments({ school: schoolId }),

    // Today's attendance (present)
    Attendance.countDocuments({
      school: schoolId,
      date: { $gte: today, $lt: tomorrow },
      status: "Present",
    }),

    // Total attendance records for today
    Attendance.countDocuments({
      school: schoolId,
      date: { $gte: today, $lt: tomorrow },
    }),

    // Today's fee collection
    FeePayment.aggregate([
      {
        $match: {
          school: new mongoose.Types.ObjectId(schoolId),
          paymentDate: { $gte: today, $lt: tomorrow },
          isReverted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),

    // Students with pending fees
    FeeCollection.countDocuments({
      school: schoolId,
      status: { $in: ["Pending", "Partial"] },
    }),

    // New admissions (last 30 days)
    StudentAdmission.countDocuments({
      school: schoolId,
      admissionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),

    // Total complaints
    Complaint.countDocuments({ school: schoolId }),

    // Open complaints
    Complaint.countDocuments({
      school: schoolId,
      status: { $in: ["Open", "In Progress"] },
    }),

    // Library books count
    LibraryBook.countDocuments({ school: schoolId }),

    // Issued books count
    BookIssue.countDocuments({
      school: schoolId,
      status: "Issued",
    }),

    // Transport routes count
    TransportRoute.countDocuments({ school: schoolId, status: "Active" }),

    // Students using transport
    StudentAdmission.countDocuments({
      school: schoolId,
      transportEnabled: true,
    }),

    // Gender distribution
    StudentAdmission.aggregate([
      {
        $match: {
          school: new mongoose.Types.ObjectId(schoolId),
          status: "Active",
        },
      },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]),

    // Staff leaves for today
    Leave.countDocuments({
      school: schoolId,
      applicant_type: "Teacher",
      status: "Approved",
      from_date: { $lte: today },
      to_date: { $gte: today },
    }),

    // Birthdays today
    StudentAdmission.countDocuments({
      school: schoolId,
      status: "Active",
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, today.getDate()] },
          { $eq: [{ $month: "$dateOfBirth" }, today.getMonth() + 1] },
        ],
      },
    }),

    // Total fee data
    FeeCollection.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          paidAmount: { $sum: "$paidAmount" },
        },
      },
    ]),

    // Weekly attendance data
    Attendance.aggregate([
      {
        $match: {
          school: new mongoose.Types.ObjectId(schoolId),
          date: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
          },
          leave: { $sum: 0 }, // Can be enhanced with leave tracking
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Upcoming exams count (next 30 days)
    Examination.countDocuments({
      school: schoolId,
      exam_date: {
        $gte: today,
        $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    }),

    // Complaints by status
    Complaint.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Complaints by priority
    Complaint.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Calculate derived values
  const todayAttendancePercentage =
    totalAttendanceRecords > 0
      ? parseFloat(
          ((todayAttendance / totalAttendanceRecords) * 100).toFixed(2)
        )
      : 0;

  const todayAbsent = totalAttendanceRecords - todayAttendance;
  const todayCollection = todayPayments.length > 0 ? todayPayments[0].total : 0;

  // Process gender ratio
  const genderRatio = { boys: 0, girls: 0, other: 0 };
  genderCounts.forEach((item) => {
    if (item._id && item._id.toLowerCase() === "male") {
      genderRatio.boys = item.count;
    } else if (item._id && item._id.toLowerCase() === "female") {
      genderRatio.girls = item.count;
    } else if (item._id) {
      genderRatio.other = item.count;
    }
  });

  // Staff calculations
  const staffPresent = totalTeachers - staffLeaves;
  const staffAbsent = 0; // Can be enhanced with teacher attendance tracking
  const staffLeave = staffLeaves;

  // Fee percentages
  const feeCollectedPercentage =
    totalFeeData.length > 0 && totalFeeData[0].totalAmount > 0
      ? parseFloat(
          (
            (totalFeeData[0].paidAmount / totalFeeData[0].totalAmount) *
            100
          ).toFixed(2)
        )
      : 0;
  const feePendingPercentage =
    totalFeeData.length > 0 && totalFeeData[0].totalAmount > 0
      ? parseFloat(
          (
            ((totalFeeData[0].totalAmount - totalFeeData[0].paidAmount) /
              totalFeeData[0].totalAmount) *
            100
          ).toFixed(2)
        )
      : 0;

  // Process complaint breakdown
  const complaintBreakdown = {
    total: complaints,
    inProgress: 0,
    resolved: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  complaintsByStatus.forEach((item) => {
    if (item._id === "In Progress") complaintBreakdown.inProgress = item.count;
    if (item._id === "Resolved") complaintBreakdown.resolved = item.count;
  });

  complaintsByPriority.forEach((item) => {
    if (item._id === "Low") complaintBreakdown.low = item.count;
    if (item._id === "Medium") complaintBreakdown.medium = item.count;
    if (item._id === "High") complaintBreakdown.high = item.count;
    if (item._id === "Critical") complaintBreakdown.critical = item.count;
  });

  return {
    school: schoolId,
    totalStudents,
    activeStudents: totalStudents,
    totalTeachers,
    totalStaff: totalTeachers,
    todayAttendancePercentage,
    todayPresent: todayAttendance,
    todayAbsent,
    totalAttendanceRecords,
    todayCollection,
    totalFeeAmount: totalFeeData.length > 0 ? totalFeeData[0].totalAmount : 0,
    totalPaidAmount: totalFeeData.length > 0 ? totalFeeData[0].paidAmount : 0,
    feeCollectedPercentage,
    feePendingPercentage,
    feeDueStudents,
    newAdmissions,
    complaints,
    openComplaints,
    birthdays: birthdaysToday,
    libraryBooks,
    issuedBooks,
    vehicles: {
      routes: transportRoutes,
      students: studentsWithTransport,
    },
    genderRatio,
    staffPresent,
    staffAbsent,
    staffLeave,
    pendingItems: {
      feeDues: feeDueStudents,
      complaints: openComplaints,
      overdueDocs: 0, // Can be enhanced with document tracking
    },
    upcomingHolidays: 0, // Can be enhanced with holiday model
    weeklyAttendance: weeklyAttendanceData.map((day) => ({
      date: new Date(day._id),
      present: day.present,
      absent: day.absent,
      leave: day.leave,
    })),
    upcomingExams: [],
    complaintBreakdown,
  };
}

/**
 * Helper function to format dashboard response
 * Converts model data to API response format
 */
function formatDashboardResponse(data) {
  return {
    totalStudents: data.totalStudents,
    totalTeachers: data.totalTeachers,
    totalStaff: data.totalStaff,
    todayAttendancePercentage: data.todayAttendancePercentage,
    todayCollection: data.todayCollection,
    absentToday: data.todayAbsent,
    feeDueStudents: data.feeDueStudents,
    newAdmissions: data.newAdmissions,
    complaints: data.openComplaints,
    birthdays: data.birthdays,
    libraryBooks: data.libraryBooks,
    issuedBooks: data.issuedBooks,
    vehicles: data.vehicles,
    upcomingHolidays: data.upcomingHolidays,
    genderRatio: data.genderRatio,
    staffPresent: data.staffPresent,
    staffAbsent: data.staffAbsent,
    staffLeave: data.staffLeave,
    feeCollected: data.feeCollectedPercentage,
    feePending: data.feePendingPercentage,
    pendingItems: data.pendingItems,
    weeklyAttendance: data.weeklyAttendance || [],
    upcomingExams: data.upcomingExams || [],
    todayBirthdays: data.todayBirthdays || [],
    complaintBreakdown: data.complaintBreakdown || {
      total: 0,
      inProgress: 0,
      resolved: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
  };
}
