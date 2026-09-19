const mongoose = require("mongoose");

/**
 * Dashboard Statistics Model
 * Stores aggregated dashboard data for school admin
 * Can be used for caching to improve performance
 */
const dashboardSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
      index: true,
    },
    
    // ─── STUDENT STATISTICS ────────────────────────────────────────────────
    totalStudents: { type: Number, default: 0 },
    activeStudents: { type: Number, default: 0 },
    newAdmissions: { type: Number, default: 0 }, // Last 30 days
    
    // ─── STAFF STATISTICS ──────────────────────────────────────────────────
    totalTeachers: { type: Number, default: 0 },
    totalStaff: { type: Number, default: 0 },
    staffPresent: { type: Number, default: 0 },
    staffAbsent: { type: Number, default: 0 },
    staffLeave: { type: Number, default: 0 },
    
    // ─── ATTENDANCE STATISTICS ─────────────────────────────────────────────
    todayAttendancePercentage: { type: Number, default: 0 },
    todayPresent: { type: Number, default: 0 },
    todayAbsent: { type: Number, default: 0 },
    totalAttendanceRecords: { type: Number, default: 0 },
    
    // ─── FINANCIAL STATISTICS ──────────────────────────────────────────────
    todayCollection: { type: Number, default: 0 },
    totalFeeAmount: { type: Number, default: 0 },
    totalPaidAmount: { type: Number, default: 0 },
    feeCollectedPercentage: { type: Number, default: 0 },
    feePendingPercentage: { type: Number, default: 0 },
    feeDueStudents: { type: Number, default: 0 },
    
    // ─── GENDER DISTRIBUTION ───────────────────────────────────────────────
    genderRatio: {
      boys: { type: Number, default: 0 },
      girls: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    
    // ─── OTHER STATISTICS ──────────────────────────────────────────────────
    complaints: { type: Number, default: 0 },
    openComplaints: { type: Number, default: 0 },
    birthdays: { type: Number, default: 0 },
    libraryBooks: { type: Number, default: 0 },
    issuedBooks: { type: Number, default: 0 },
    
    // ─── TRANSPORT STATISTICS ──────────────────────────────────────────────
    vehicles: {
      routes: { type: Number, default: 0 },
      students: { type: Number, default: 0 },
    },
    
    // ─── PENDING ITEMS ─────────────────────────────────────────────────────
    pendingItems: {
      feeDues: { type: Number, default: 0 },
      complaints: { type: Number, default: 0 },
      overdueDocs: { type: Number, default: 0 },
    },
    
    // ─── HOLIDAYS ──────────────────────────────────────────────────────────
    upcomingHolidays: { type: Number, default: 0 },
    
    // ─── WEEKLY ATTENDANCE DATA ────────────────────────────────────────────
    weeklyAttendance: [
      {
        date: { type: Date },
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
      },
    ],
    
    // ─── UPCOMING EVENTS ───────────────────────────────────────────────────
    upcomingEvents: [
      {
        title: { type: String },
        date: { type: Date },
        type: { type: String }, // Holiday, Event, Exam
      },
    ],
    
    // ─── TODAY'S BIRTHDAYS ─────────────────────────────────────────────────
    todayBirthdays: [
      {
        name: { type: String },
        class: { type: String },
        photo: { type: String },
      },
    ],
    
    // ─── UPCOMING EXAMS ────────────────────────────────────────────────────
    upcomingExams: [
      {
        examName: { type: String },
        date: { type: Date },
        class: { type: String },
        subject: { type: String },
      },
    ],
    
    // ─── COMPLAINT BREAKDOWN ───────────────────────────────────────────────
    complaintBreakdown: {
      total: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },
    
    // ─── CACHE METADATA ────────────────────────────────────────────────────
    lastUpdated: { type: Date, default: Date.now },
    cacheVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Index for faster queries
dashboardSchema.index({ school: 1, lastUpdated: -1 });

module.exports = mongoose.model("Dashboard", dashboardSchema);
