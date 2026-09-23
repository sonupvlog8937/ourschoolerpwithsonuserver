const mongoose = require("mongoose");
const AdmissionEnquiry = require("../../model/frontOffice/admissionEnquiry.model");
const PhoneCallLog = require("../../model/frontOffice/phoneCallLog.model");
const Complaint = require("../../model/frontOffice/complaint.model");
const VisitorBook = require("../../model/frontOffice/visitorBook.model");
const ChatTicket = require("../../model/chatTicket.model");
const UserActivity = require("../../model/userActivity.model");
const Teacher = require("../../model/role/teacher.model");
const Student = require("../../model/role/student.model");
const Parent = require("../../model/role/parent.model");
const Accountant = require("../../model/role/accountant.model");
const Librarian = require("../../model/role/librarian.model");
const Receptionist = require("../../model/role/receptionist.model");
const ViceAdmin = require("../../model/role/viceAdmin.model");

const schoolObjectId = (id) => new mongoose.Types.ObjectId(id);
const dateRange = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
};

const getFollowUpDashboard = async (req, res) => {
  try {
    const school = schoolObjectId(req.user.schoolId);
    const { start, end } = dateRange(30);
    const filter = { school, followUpDate: { $ne: null } };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [enquiries, calls, upcoming, overdue, active, converted, unassigned, todayFollowUps] = await Promise.all([
      AdmissionEnquiry.countDocuments(filter),
      PhoneCallLog.countDocuments(filter),
      AdmissionEnquiry.countDocuments({ ...filter, followUpDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) } }),
      AdmissionEnquiry.countDocuments({ ...filter, followUpDate: { $lt: new Date() }, status: { $nin: ["Converted", "Closed"] } }),
      AdmissionEnquiry.countDocuments({ school, status: { $in: ["New", "Follow-up", "In Progress", "Interested"] } }),
      AdmissionEnquiry.countDocuments({ school, status: "Converted" }),
      AdmissionEnquiry.countDocuments({ school, assignedTo: { $exists: false } }),
      AdmissionEnquiry.countDocuments({ school, followUpDate: { $gte: today, $lt: tomorrow } }),
    ]);

    // Class-wise breakdown aggregation
    const classWiseBreakdown = await AdmissionEnquiry.aggregate([
      { $match: { school } },
      {
        $group: {
          _id: "$classAppliedFor",
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } },
          active: { $sum: { $cond: [{ $in: ["$status", ["New", "Follow-up", "In Progress", "Interested"]] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    // PRM-wise performance aggregation
    const prmWisePerformance = await AdmissionEnquiry.aggregate([
      { $match: { school, assignedTo: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "prm",
        },
      },
      { $unwind: "$prm" },
      {
        $group: {
          _id: "$assignedTo",
          prmName: { $first: "$prm.name" },
          assigned: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } },
        },
      },
      { $sort: { assigned: -1 } },
      { $limit: 10 },
    ]);

    const [recentEnquiries, recentCalls] = await Promise.all([
      AdmissionEnquiry.find({ school, followUpDate: { $gte: start, $lte: end } })
        .select("studentName guardianName followUpDate status priority")
        .sort({ followUpDate: 1 })
        .limit(10)
        .lean(),
      PhoneCallLog.find({ school, followUpDate: { $gte: start, $lte: end } })
        .select("name phone followUpDate callType")
        .sort({ followUpDate: 1 })
        .limit(10)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        total: enquiries + calls,
        active,
        converted,
        upcoming,
        todayFollowUps,
        unassigned,
        overdue,
        completed: 0,
        enquiries: recentEnquiries,
        calls: recentCalls,
        classWiseBreakdown,
        prmWisePerformance,
      },
    });
  } catch (error) {
    console.error("❌ Follow-up Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch follow-up dashboard",
      error: error.message,
    });
  }
};

const getComplaintDashboard = async (req, res) => {
  try {
    const school = schoolObjectId(req.user.schoolId);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      inProgress,
      resolved,
      unresolved,
      todays,
      priorities,
      statusBreakdown,
      complaints,
      statusOptions,
      priorityOptions,
    ] = await Promise.all([
      Complaint.countDocuments({ school }),
      Complaint.countDocuments({ school, status: "Open" }),
      Complaint.countDocuments({ school, status: "In Progress" }),
      Complaint.countDocuments({ school, status: { $in: ["Resolved", "Closed"] } }),
      Complaint.countDocuments({ school, status: { $in: ["Open", "In Progress"] } }),
      Complaint.countDocuments({ school, date: { $gte: today } }),
      Complaint.aggregate([{ $match: { school } }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: { school } }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.find({ school }).sort({ date: -1 }).limit(25).lean(),
      Complaint.distinct("status", { school }).then((values) => values.sort((a, b) => a.localeCompare(b))),
      Complaint.distinct("priority", { school }).then((values) => values.sort((a, b) => a.localeCompare(b))),
    ]);

    const priority = {};
    priorities.forEach((item) => {
      if (item._id) {
        priority[item._id] = item.count;
      }
    });

    const actionBreakdown = statusBreakdown.map((item) => ({
      label: item._id || 'Unknown',
      value: item.count,
    }));

    return res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        unresolved,
        todays,
        priority,
        complaints,
        statusOptions,
        priorityOptions,
        actionBreakdown,
      },
    });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch complaint dashboard", error: error.message }); }
};

const getVisitorDashboard = async (req, res) => {
  try {
    const school = schoolObjectId(req.user.schoolId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
    const [total, todaysVisitors, currentlyInside, checkedOutToday, thisWeek, thisMonth, dailyVisitors, visitors] = await Promise.all([
      VisitorBook.countDocuments({ school }),
      VisitorBook.countDocuments({ school, date: { $gte: today } }),
      VisitorBook.countDocuments({ school, status: "In" }),
      VisitorBook.countDocuments({ school, status: "Out", outTime: { $gte: today } }),
      VisitorBook.countDocuments({ school, date: { $gte: weekStart } }),
      VisitorBook.countDocuments({ school, date: { $gte: monthStart } }),
      VisitorBook.aggregate([{ $match: { school, date: { $gte: weekStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      VisitorBook.find({ school }).sort({ date: -1 }).limit(20).lean(),
    ]);
    return res.json({ success: true, data: { total, todaysVisitors, currentlyInside, checkedOutToday, thisWeek, thisMonth, dailyVisitors, visitors } });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch visitor dashboard", error: error.message }); }
};

const getChatDashboard = async (req, res) => {
  try {
    const school = schoolObjectId(req.user.schoolId);
    const [total, open, inProgress, resolved, closed, reopened, tickets] = await Promise.all([
      ChatTicket.countDocuments({ school }),
      ChatTicket.countDocuments({ school, status: "Open" }),
      ChatTicket.countDocuments({ school, status: "In Progress" }),
      ChatTicket.countDocuments({ school, status: { $in: ["Resolved", "Closed"] } }),
      ChatTicket.countDocuments({ school, status: "Closed" }),
      ChatTicket.countDocuments({ school, reopened: true }),
      ChatTicket.find({ school }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return res.json({ success: true, data: { total, open, inProgress, resolved, closed, reopened, tickets } });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch chat dashboard", error: error.message }); }
};

const getUserActivityDashboard = async (req, res) => {
  try {
    const school = schoolObjectId(req.user.schoolId);
    const requestedDays = Math.max(Number.parseInt(req.query.days, 10) || 7, 1);
    const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const requestedSearch = String(req.query.search || "").trim().toLowerCase();
    const requestedRole = String(req.query.role || "all");
    const requestedStatus = String(req.query.status || "all");
    const { start, end } = dateRange(requestedDays);
    const userModels = [["Teacher", Teacher], ["Student", Student], ["Parent", Parent], ["Accountant", Accountant], ["Librarian", Librarian], ["Receptionist", Receptionist], ["Principal", ViceAdmin]];
    const [registeredUsers, activeNames, activeTodayNames, failed, dailyActivity, activityRows, roleActivity] = await Promise.all([
      Promise.all(userModels.map(async ([role, Model]) => (await Model.find({ school }).select("name email status").lean()).map((row) => ({ _id: row._id, user: row.name || row.email, email: row.email || "", role, registeredStatus: row.status || "Active" })))).then((groups) => groups.flat()),
      UserActivity.distinct("user", { school, createdAt: { $gte: start, $lte: end }, status: "Success" }),
      UserActivity.distinct("user", { school, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: "Success" }),
      UserActivity.countDocuments({ school, status: "Failed", createdAt: { $gte: start } }),
      UserActivity.aggregate([{ $match: { school, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      UserActivity.aggregate([{ $match: { school } }, { $sort: { createdAt: -1 } }, { $group: { _id: "$user", user: { $first: "$user" }, status: { $first: "$status" }, action: { $first: "$action" }, createdAt: { $first: "$createdAt" } } }]),
      UserActivity.aggregate([{ $match: { school, createdAt: { $gte: start, $lte: end }, status: "Success" } }, { $group: { _id: { role: "$role", user: "$user" } } }, { $group: { _id: "$_id.role", active: { $sum: 1 } } }, { $project: { _id: 0, role: "$_id", active: 1 } }]),
    ]);
    const activityByUser = new Map(activityRows.map((row) => [String(row.user || "").trim().toLowerCase(), row]));
    const users = registeredUsers.map((registered) => {
      const activity = activityByUser.get(String(registered.user || "").trim().toLowerCase()) || activityByUser.get(String(registered.email || "").trim().toLowerCase());
      return { ...registered, action: activity?.action || "", createdAt: activity?.createdAt || null, status: activity ? (activity.status === "Success" ? "Active" : "Inactive") : "Never" };
    });
    const names = (rows) => new Set(rows.map((name) => String(name).trim().toLowerCase()));
    const activeNameSet = names(activeNames);
    const activeTodaySet = names(activeTodayNames);
    const active = users.filter((user) => user.status === "Active").length;
    const activeToday = users.filter((user) => activeTodaySet.has(String(user.user).trim().toLowerCase())).length;
    const roleTotals = users.reduce((map, user) => { map[user.role] = (map[user.role] || 0) + 1; return map; }, {});
    const roleActive = roleActivity.reduce((map, item) => { map[item.role] = item.active; return map; }, {});
    const roleWiseUtilization = Object.entries(roleTotals).map(([role, total]) => ({ role, total, active: roleActive[role] || 0, activeToday: 0 }));
    const totalUsers = users.length;
    const neverLoggedIn = users.filter((user) => user.status === "Never").length;
    const filteredUsers = users.filter((user) => {
      const text = `${user.user} ${user.email} ${user.role}`.toLowerCase();
      return (!requestedSearch || text.includes(requestedSearch)) && (requestedRole === "all" || user.role === requestedRole) && (requestedStatus === "all" || user.status === requestedStatus);
    });
    const totalRecords = filteredUsers.length;
    const pageCount = Math.max(Math.ceil(totalRecords / requestedLimit), 1);
    const safePage = Math.min(requestedPage, pageCount);
    const pagedUsers = filteredUsers.slice((safePage - 1) * requestedLimit, safePage * requestedLimit);
    return res.json({ success: true, data: { totalUsers, active, inactive: Math.max(totalUsers - active, 0), activeToday, neverLoggedIn, failed, dailyActivity, users: pagedUsers, roleOptions: [...new Set(users.map((user) => user.role).filter(Boolean))], roleWiseUtilization, days: requestedDays, statusOptions: ["Active", "Inactive", "Never"], pagination: { page: safePage, limit: requestedLimit, totalRecords, totalPages: pageCount } } });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch user activity dashboard", error: error.message }); }
};

module.exports = { getFollowUpDashboard, getComplaintDashboard, getVisitorDashboard, getChatDashboard, getUserActivityDashboard };
