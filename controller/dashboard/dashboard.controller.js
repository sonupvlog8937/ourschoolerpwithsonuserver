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

  /**
   * Get Staff Dashboard Data
   * Returns basic staff information for any staff role
   */
  getStaffDashboard: async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const schoolId = req.user.schoolId;
      const userRole = req.user.role; // TEACHER, ACCOUNTANT, LIBRARIAN, RECEPTIONIST, etc.

      let user = null;
      let firstName = "";
      let lastName = "";
      let designation = "";

      // Based on role, fetch from appropriate model
      switch (userRole) {
        case "SCHOOL":
          // School admin/owner
          const School = require("../../model/role/school.model");
          user = await School.findOne({ _id: userId })
            .select("school_name owner_name email school_image")
            .lean();
          
          if (user) {
            const nameParts = user.owner_name?.split(" ") || [];
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
            designation = "SCHOOL ADMIN";
          }
          break;

        case "TEACHER":
          user = await Teacher.findOne({ _id: userId, school: schoolId })
            .select("name email qualification teacher_image")
            .populate("school", "school_name")
            .lean();
          
          if (user) {
            const nameParts = user.name?.split(" ") || [];
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
            designation = user.qualification || "TEACHING";
          }
          break;

        case "ACCOUNTANT":
          const Accountant = require("../../model/role/accountant.model");
          user = await Accountant.findOne({ _id: userId, school: schoolId })
            .select("name email accountant_image")
            .populate("school", "school_name")
            .lean();
          
          if (user) {
            const nameParts = user.name?.split(" ") || [];
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
            designation = "ACCOUNTANT";
          }
          break;

        case "LIBRARIAN":
          const Librarian = require("../../model/role/librarian.model");
          user = await Librarian.findOne({ _id: userId, school: schoolId })
            .select("name email librarian_image")
            .populate("school", "school_name")
            .lean();
          
          if (user) {
            const nameParts = user.name?.split(" ") || [];
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
            designation = "LIBRARIAN";
          }
          break;

        case "RECEPTIONIST":
          const Receptionist = require("../../model/role/receptionist.model");
          user = await Receptionist.findOne({ _id: userId, school: schoolId })
            .select("name email receptionist_image")
            .populate("school", "school_name")
            .lean();
          
          if (user) {
            const nameParts = user.name?.split(" ") || [];
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
            designation = "RECEPTIONIST";
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Invalid staff role: ${userRole}`,
          });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Build response with proper fields
      const responseData = {
        firstName,
        lastName,
        email: user.email || "",
        phone: user.phone || "",
        role: userRole,
        designation,
        school_name: user.school_name || user.school?.school_name || "School Name Not Available",
        image_url: user.school_image || user.teacher_image || user.accountant_image || user.librarian_image || user.receptionist_image || "",
      };

      res.status(200).json({
        success: true,
        data: { user: responseData },
      });
    } catch (error) {
      console.error("Error in getStaffDashboard:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Staff Dashboard. Try later",
      });
    }
  },

  /**
   * Get Staff's Monthly Attendance
   * Returns current month attendance data for logged-in staff member
   */
  getStaffAttendance: async (req, res) => {
    try {
      const staffId = req.user.id || req.user._id;
      const schoolId = req.user.schoolId;

      // Get first and last day of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      // Get attendance records for this month
      const attendanceRecords = await Attendance.find({
        school: schoolId,
        userId: staffId,
        userType: { $in: ["Teacher", "Staff"] },
        date: { $gte: firstDay, $lte: lastDay },
      }).select("status date");

      // Calculate stats
      const present = attendanceRecords.filter((r) => r.status === "Present").length;
      const absent = attendanceRecords.filter((r) => r.status === "Absent").length;
      const leave = attendanceRecords.filter(
        (r) => r.status === "Leave" || r.status === "On Leave"
      ).length;
      const total = attendanceRecords.length;

      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      res.status(200).json({
        success: true,
        data: {
          percentage,
          present,
          absent,
          leave,
          total,
        },
      });
    } catch (error) {
      console.error("Error in getStaffAttendance:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Staff Attendance. Try later",
      });
    }
  },

  /**
   * Get Upcoming Events
   * Returns upcoming events from database
   */
  getUpcomingEvents: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try to import Event model
      let Event;
      try {
        Event = require("../../model/event.model");
      } catch (err) {
        // If model doesn't exist, return empty array
        return res.status(200).json({
          success: true,
          data: { events: [] },
        });
      }

      const events = await Event.find({
        school: schoolId,
        date: { $gte: today },
        status: { $ne: "Cancelled" },
      })
        .select("title date description")
        .sort({ date: 1 })
        .limit(5);

      res.status(200).json({
        success: true,
        data: { events },
      });
    } catch (error) {
      console.error("Error in getUpcomingEvents:", error);
      // Return empty array if error
      res.status(200).json({
        success: true,
        data: { events: [] },
      });
    }
  },

  /**
   * Get Upcoming Holidays
   * Returns upcoming holidays from database
   */
  getUpcomingHolidays: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try to import Holiday model
      let Holiday;
      try {
        Holiday = require("../../model/holiday.model");
      } catch (err) {
        // If model doesn't exist, return empty array
        return res.status(200).json({
          success: true,
          data: { holidays: [] },
        });
      }

      const holidays = await Holiday.find({
        school: schoolId,
        date: { $gte: today },
        status: { $ne: "Cancelled" },
      })
        .select("title date description")
        .sort({ date: 1 })
        .limit(5);

      res.status(200).json({
        success: true,
        data: { holidays },
      });
    } catch (error) {
      console.error("Error in getUpcomingHolidays:", error);
      // Return empty array if error
      res.status(200).json({
        success: true,
        data: { holidays: [] },
      });
    }
  },

  /**
   * Get Recent Notices
   * Returns recent notices/circulars
   */
  getRecentNotices: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const limit = parseInt(req.query.limit) || 5;

      // Try to import Notice model
      let Notice;
      try {
        Notice = require("../../model/notice.model");
      } catch (err) {
        // If model doesn't exist, return empty array
        return res.status(200).json({
          success: true,
          data: { notices: [] },
        });
      }

      const notices = await Notice.find({
        school: schoolId,
        status: "Active",
      })
        .select("title description createdAt")
        .sort({ createdAt: -1 })
        .limit(limit);

      res.status(200).json({
        success: true,
        data: { notices },
      });
    } catch (error) {
      console.error("Error in getRecentNotices:", error);
      // Return empty array if error
      res.status(200).json({
        success: true,
        data: { notices: [] },
      });
    }
  },

  /**
   * Get Accounts Dashboard Data
   * Returns financial overview including income, expense, balance
   */
  getAccountsDashboard: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Last 7 days
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);

      // This month
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Last 6 months
      const last6MonthsStart = new Date(today);
      last6MonthsStart.setMonth(today.getMonth() - 6);

      // This session (assuming session starts from April)
      const currentYear = today.getFullYear();
      const sessionStart = new Date(today.getMonth() >= 3 ? currentYear : currentYear - 1, 3, 1);

      // Fetch fee collections for different periods
      const [
        todayFees,
        thisWeekFees,
        thisMonthFees,
        pendingFees,
        quarterlyFees,
        yearlyFees,
      ] = await Promise.all([
        // Today's collection
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

        // This week's collection
        FeePayment.aggregate([
          {
            $match: {
              school: new mongoose.Types.ObjectId(schoolId),
              paymentDate: { $gte: last7Days, $lt: tomorrow },
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

        // This month's collection
        FeePayment.aggregate([
          {
            $match: {
              school: new mongoose.Types.ObjectId(schoolId),
              paymentDate: { $gte: thisMonthStart, $lt: tomorrow },
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

        // Total pending fees
        FeeCollection.aggregate([
          {
            $match: {
              school: new mongoose.Types.ObjectId(schoolId),
              status: { $in: ["Pending", "Partial"] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
              students: { $sum: 1 },
            },
          },
        ]),

        // Quarterly collection (last 3 months)
        FeePayment.aggregate([
          {
            $match: {
              school: new mongoose.Types.ObjectId(schoolId),
              paymentDate: {
                $gte: new Date(today.getFullYear(), today.getMonth() - 3, 1),
                $lt: tomorrow,
              },
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

        // Yearly collection (this session)
        FeePayment.aggregate([
          {
            $match: {
              school: new mongoose.Types.ObjectId(schoolId),
              paymentDate: { $gte: sessionStart, $lt: tomorrow },
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
      ]);

      const todayCollection = todayFees[0]?.total || 0;
      const thisWeekCollection = thisWeekFees[0]?.total || 0;
      const thisMonthCollection = thisMonthFees[0]?.total || 0;
      const totalPending = pendingFees[0]?.total || 0;
      const pendingStudents = pendingFees[0]?.students || 0;
      const quarterlyCollection = quarterlyFees[0]?.total || 0;
      const yearlyCollection = yearlyFees[0]?.total || 0;

      // Calculate collection rate
      const totalExpected = yearlyCollection + totalPending;
      const collectionRate = totalExpected > 0 ? (yearlyCollection / totalExpected) * 100 : 0;

      res.status(200).json({
        success: true,
        data: {
          todayCollection,
          thisWeekCollection,
          thisMonthCollection,
          totalPending,
          collectionSummary: {
            quarterlyCollection,
            yearlyCollection,
            pendingFees: totalPending,
            pendingStudents,
            collectionRate: parseFloat(collectionRate.toFixed(2)),
          },
        },
      });
    } catch (error) {
      console.error("Error in getAccountsDashboard:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Accounts Dashboard. Try later",
      });
    }
  },

  /**
   * Get Fee Collection Trends
   * Returns monthly collection data for chart
   */
  getFeeCollectionTrends: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const months = parseInt(req.query.months) || 12;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const trends = await FeePayment.aggregate([
        {
          $match: {
            school: new mongoose.Types.ObjectId(schoolId),
            paymentDate: { $gte: startDate },
            isReverted: false,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$paymentDate" },
              month: { $month: "$paymentDate" },
            },
            collected: { $sum: "$amount" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
        {
          $project: {
            _id: 0,
            month: {
              $arrayElemAt: [
                ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                { $subtract: ["$_id.month", 1] },
              ],
            },
            collected: 1,
            pending: 0, // Can be calculated if needed
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: { trends },
      });
    } catch (error) {
      console.error("Error in getFeeCollectionTrends:", error);
      res.status(500).json({
        success: false,
        message: "Server Error in Getting Fee Collection Trends. Try later",
      });
    }
  },

  /**
   * Get Recent Transactions
   * Returns recent fee payments
   */
  getRecentTransactions: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const limit = parseInt(req.query.limit) || 5;

      const transactions = await FeePayment.find({
        school: schoolId,
        isReverted: false,
      })
        .populate("student", "firstName lastName class")
        .populate("feeType", "name")
        .sort({ paymentDate: -1 })
        .limit(limit)
        .select("student feeType amount paymentDate paymentMode");

      const formattedTransactions = transactions.map((t) => ({
        studentName: t.student
          ? `${t.student.firstName} ${t.student.lastName}`
          : "Unknown",
        feeType: t.feeType?.name || "Fee",
        amount: t.amount,
        date: t.paymentDate,
        paymentMode: t.paymentMode,
      }));

      res.status(200).json({
        success: true,
        data: { transactions: formattedTransactions },
      });
    } catch (error) {
      console.error("Error in getRecentTransactions:", error);
      res.status(200).json({
        success: true,
        data: { transactions: [] },
      });
    }
  },

  /**
   * Get Bank Balances
   * Returns petty cash and bank account balances from database
   */
  getBankBalances: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      // Import Account model
      const Account = require("../../model/account.model");

      // Fetch account heads from database
      const accountHeads = await Account.find({
        school: schoolId,
        resource: "account-head",
        status: "Active",
      })
        .select("data")
        .lean();

      // Separate petty cash and bank accounts
      const pettyCash = [];
      const banks = [];
      let totalBalance = 0;

      accountHeads.forEach((acc) => {
        const accountData = acc.data || {};
        const balance = parseFloat(accountData.opening_balance || accountData.balance || 0);
        
        const accountInfo = {
          name: accountData.name || accountData.account_name || "Unknown",
          balance,
        };

        totalBalance += balance;

        // Check if it's cash or bank
        const accountType = (accountData.type || accountData.account_type || "").toLowerCase();
        const accountName = (accountData.name || "").toLowerCase();

        if (accountType.includes("cash") || accountName.includes("cash") || accountName.includes("petty")) {
          pettyCash.push(accountInfo);
        } else if (accountType.includes("bank") || accountName.includes("bank") || accountData.account_number) {
          banks.push({
            ...accountInfo,
            accountNumber: accountData.account_number || accountData.bank_account_number || "",
          });
        } else {
          // Default to bank if type is unclear
          banks.push(accountInfo);
        }
      });

      // If no accounts found, return default structure
      const responseData = {
        pettyCash: pettyCash.length > 0 ? pettyCash : [],
        banks: banks.length > 0 ? banks : [],
        totalBalance: Math.round(totalBalance),
      };

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("Error in getBankBalances:", error);
      // Return empty structure on error
      res.status(200).json({
        success: true,
        data: {
          pettyCash: [],
          banks: [],
          totalBalance: 0,
        },
      });
    }
  },

  /**
   * Get Income and Expense Data
   * Returns income and expense breakdown by time periods
   */
  getIncomeExpenseData: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const Account = require("../../model/account.model");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Last 7 days
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);

      // This month
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Last 6 months
      const last6MonthsStart = new Date(today);
      last6MonthsStart.setMonth(today.getMonth() - 6);

      // This session (April to March)
      const currentYear = today.getFullYear();
      const sessionStart = new Date(today.getMonth() >= 3 ? currentYear : currentYear - 1, 3, 1);

      // Fetch Income records
      const incomeRecords = await Account.find({
        school: schoolId,
        resource: "income",
        status: { $in: ["Active", "Completed"] },
      })
        .select("data createdAt")
        .lean();

      // Fetch Expense records
      const expenseRecords = await Account.find({
        school: schoolId,
        resource: "expenses",
        status: { $in: ["Active", "Completed"] },
      })
        .select("data createdAt")
        .lean();

      // Helper function to calculate totals for a date range
      const calculateTotals = (records, startDate, endDate) => {
        return records
          .filter((r) => {
            const date = new Date(r.createdAt || r.data?.date);
            return date >= startDate && date < endDate;
          })
          .reduce((sum, r) => {
            const amount = parseFloat(r.data?.amount || r.data?.total_amount || 0);
            const cashAmount = parseFloat(r.data?.cash_amount || 0);
            const bankAmount = parseFloat(r.data?.bank_amount || 0);
            return {
              total: sum.total + amount,
              cash: sum.cash + cashAmount,
              bank: sum.bank + bankAmount,
            };
          }, { total: 0, cash: 0, bank: 0 });
      };

      // Calculate income
      const income = {
        today: calculateTotals(incomeRecords, today, tomorrow),
        last7Days: calculateTotals(incomeRecords, last7Days, tomorrow),
        thisMonth: calculateTotals(incomeRecords, thisMonthStart, tomorrow),
        last6Months: calculateTotals(incomeRecords, last6MonthsStart, tomorrow),
        thisSession: calculateTotals(incomeRecords, sessionStart, tomorrow),
      };

      // Calculate expense
      const expense = {
        today: calculateTotals(expenseRecords, today, tomorrow),
        last7Days: calculateTotals(expenseRecords, last7Days, tomorrow),
        thisMonth: calculateTotals(expenseRecords, thisMonthStart, tomorrow),
        last6Months: calculateTotals(expenseRecords, last6MonthsStart, tomorrow),
        thisSession: calculateTotals(expenseRecords, sessionStart, tomorrow),
      };

      // Calculate balance (income - expense)
      const balance = {
        today: {
          total: income.today.total - expense.today.total,
          cash: income.today.cash - expense.today.cash,
          bank: income.today.bank - expense.today.bank,
        },
        last7Days: {
          total: income.last7Days.total - expense.last7Days.total,
          cash: income.last7Days.cash - expense.last7Days.cash,
          bank: income.last7Days.bank - expense.last7Days.bank,
        },
        thisMonth: {
          total: income.thisMonth.total - expense.thisMonth.total,
          cash: income.thisMonth.cash - expense.thisMonth.cash,
          bank: income.thisMonth.bank - expense.thisMonth.bank,
        },
        last6Months: {
          total: income.last6Months.total - expense.last6Months.total,
          cash: income.last6Months.cash - expense.last6Months.cash,
          bank: income.last6Months.bank - expense.last6Months.bank,
        },
        thisSession: {
          total: income.thisSession.total - expense.thisSession.total,
          cash: income.thisSession.cash - expense.thisSession.cash,
          bank: income.thisSession.bank - expense.thisSession.bank,
        },
      };

      res.status(200).json({
        success: true,
        data: {
          income,
          expense,
          balance,
        },
      });
    } catch (error) {
      console.error("Error in getIncomeExpenseData:", error);
      res.status(200).json({
        success: true,
        data: {
          income: {
            today: { total: 0, cash: 0, bank: 0 },
            last7Days: { total: 0, cash: 0, bank: 0 },
            thisMonth: { total: 0, cash: 0, bank: 0 },
            last6Months: { total: 0, cash: 0, bank: 0 },
            thisSession: { total: 0, cash: 0, bank: 0 },
          },
          expense: {
            today: { total: 0, cash: 0, bank: 0 },
            last7Days: { total: 0, cash: 0, bank: 0 },
            thisMonth: { total: 0, cash: 0, bank: 0 },
            last6Months: { total: 0, cash: 0, bank: 0 },
            thisSession: { total: 0, cash: 0, bank: 0 },
          },
          balance: {
            today: { total: 0, cash: 0, bank: 0 },
            last7Days: { total: 0, cash: 0, bank: 0 },
            thisMonth: { total: 0, cash: 0, bank: 0 },
            last6Months: { total: 0, cash: 0, bank: 0 },
            thisSession: { total: 0, cash: 0, bank: 0 },
          },
        },
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
