const VisitorBook = require("../../model/frontOffice/visitorBook.model");
const Student = require("../../model/role/student.model");
const Teacher = require("../../model/role/teacher.model");
const { Purpose } = require("../../model/frontOffice/setup.model");
const mongoose = require("mongoose");

module.exports = {
  // Add visitor
  addVisitor: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      
      // Validate required fields
      if (!req.body.visitorName || !req.body.purpose || !req.body.meetingWith) {
        return res.status(400).json({ 
          success: false, 
          message: "Visitor name, purpose, and meeting with are required" 
        });
      }

      const visitorData = { 
        ...req.body, 
        school: schoolId,
        date: req.body.date || new Date(),
        inTime: req.body.inTime || new Date(),
        status: "In"
      };

      const visitor = new VisitorBook(visitorData);
      await visitor.save();

      res.status(201).json({ success: true, message: "Visitor added successfully", data: visitor });
    } catch (error) {
      console.error("Error adding visitor:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Error adding visitor", 
        error: error.message 
      });
    }
  },

  // Get all visitors
  getAllVisitors: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status, purpose, meetingWith, date, search, page = 1, limit = 10 } = req.query;

      const safePage  = Math.max(parseInt(page,  10) || 1,  1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

      const filter = { school: schoolId };

      if (status)     filter.status     = status;
      if (purpose)    filter.purpose    = { $regex: purpose, $options: "i" };
      if (meetingWith) filter.meetingWith = meetingWith;

      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        filter.date = { $gte: startDate, $lte: endDate };
      }

      if (search) {
        filter.$or = [
          { visitorName:      { $regex: search, $options: "i" } },
          { phone:            { $regex: search, $options: "i" } },
          { email:            { $regex: search, $options: "i" } },
          { idCard:           { $regex: search, $options: "i" } },
          { meetingPersonName:{ $regex: search, $options: "i" } },
          { purpose:          { $regex: search, $options: "i" } },
        ];
      }

      const skip = (safePage - 1) * safeLimit;

      // Fetch dynamic purpose options from Setup
      const purposes = await Purpose.find({ school: schoolId }).select("name").lean();
      const purposeOptions = purposes.map(p => p.name);

      const [visitors, total] = await Promise.all([
        VisitorBook.find(filter)
          .populate("approvedBy", "name email")
          .sort({ date: -1, inTime: -1 })
          .skip(skip)
          .limit(safeLimit),
        VisitorBook.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: visitors,
        purposeOptions, // Dynamic from Setup → Purpose
        pagination: {
          total,
          page:  safePage,
          limit: safeLimit,
          pages: Math.max(Math.ceil(total / safeLimit), 1),
        },
      });
    } catch (error) {
      console.error("Error fetching visitors:", error);
      res.status(500).json({ success: false, message: "Error fetching visitors", error: error.message });
    }
  },

  // Get visitor by ID
  getVisitorById: async (req, res) => {
    try {
      const { id } = req.params;
      const visitor = await VisitorBook.findById(id).populate("approvedBy", "name email");

      if (!visitor) {
        return res.status(404).json({ success: false, message: "Visitor not found" });
      }

      res.status(200).json({ success: true, data: visitor });
    } catch (error) {
      console.error("Error fetching visitor:", error);
      res.status(500).json({ success: false, message: "Error fetching visitor", error: error.message });
    }
  },

  // Update visitor
  updateVisitor: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const visitor = await VisitorBook.findByIdAndUpdate(id, updates, { new: true });

      if (!visitor) {
        return res.status(404).json({ success: false, message: "Visitor not found" });
      }

      res.status(200).json({ success: true, message: "Visitor updated successfully", data: visitor });
    } catch (error) {
      console.error("Error updating visitor:", error);
      res.status(500).json({ success: false, message: "Error updating visitor", error: error.message });
    }
  },

  // Mark visitor out
  markVisitorOut: async (req, res) => {
    try {
      const { id } = req.params;
      const { outTime, note } = req.body;

      const visitor = await VisitorBook.findByIdAndUpdate(
        id,
        {
          status: "Out",
          outTime: outTime ? new Date(outTime) : new Date(),
          ...(note && { note }),
        },
        { new: true }
      );

      if (!visitor) {
        return res.status(404).json({ success: false, message: "Visitor not found" });
      }

      res.status(200).json({ success: true, message: "Visitor marked out successfully", data: visitor });
    } catch (error) {
      console.error("Error marking visitor out:", error);
      res.status(500).json({ success: false, message: "Error marking visitor out", error: error.message });
    }
  },

  // Delete visitor
  deleteVisitor: async (req, res) => {
    try {
      const { id } = req.params;
      const visitor = await VisitorBook.findByIdAndDelete(id);

      if (!visitor) {
        return res.status(404).json({ success: false, message: "Visitor not found" });
      }

      res.status(200).json({ success: true, message: "Visitor deleted successfully" });
    } catch (error) {
      console.error("Error deleting visitor:", error);
      res.status(500).json({ success: false, message: "Error deleting visitor", error: error.message });
    }
  },

  // Get visitor statistics
  getVisitorStats: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { startDate, endDate } = req.query;

      const filter = { school: schoolId };

      // Date range filter
      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        // Default to current month
        const now = new Date();
        filter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      }

      const stats = await VisitorBook.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalVisitors: { $sum: 1 },
            totalPersons: { $sum: "$numberOfPersons" },
            currentlyIn: {
              $sum: { $cond: [{ $eq: ["$status", "In"] }, 1, 0] },
            },
            checkedOut: {
              $sum: { $cond: [{ $eq: ["$status", "Out"] }, 1, 0] },
            },
          },
        },
      ]);

      // Purpose-wise breakdown
      const purposeBreakdown = await VisitorBook.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$purpose",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Meeting with breakdown
      const meetingWithBreakdown = await VisitorBook.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$meetingWith",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Daily visitor count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailyVisitors = await VisitorBook.aggregate([
        {
          $match: {
            school: new mongoose.Types.ObjectId(schoolId),
            date: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          summary: stats[0] || {
            totalVisitors: 0,
            totalPersons: 0,
            currentlyIn: 0,
            checkedOut: 0,
          },
          purposeBreakdown,
          meetingWithBreakdown,
          dailyVisitors,
        },
      });
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
      res.status(500).json({ success: false, message: "Error fetching visitor stats", error: error.message });
    }
  },

  // Get today's visitors
  getTodayVisitors: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const visitors = await VisitorBook.find({
        school: schoolId,
        date: { $gte: today, $lt: tomorrow },
      })
        .populate("approvedBy", "name email")
        .sort({ inTime: -1 });

      res.status(200).json({ success: true, data: visitors });
    } catch (error) {
      console.error("Error fetching today's visitors:", error);
      res.status(500).json({ success: false, message: "Error fetching today's visitors", error: error.message });
    }
  },

  // Get currently in visitors
  getCurrentlyInVisitors: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      const visitors = await VisitorBook.find({
        school: schoolId,
        status: "In",
      })
        .populate("approvedBy", "name email")
        .sort({ inTime: -1 });

      res.status(200).json({ success: true, data: visitors });
    } catch (error) {
      console.error("Error fetching currently in visitors:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching currently in visitors",
        error: error.message,
      });
    }
  },

  // Bulk check-out
  bulkCheckOut: async (req, res) => {
    try {
      const { visitorIds } = req.body;

      if (!visitorIds || !Array.isArray(visitorIds) || visitorIds.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid visitor IDs" });
      }

      const result = await VisitorBook.updateMany(
        { _id: { $in: visitorIds }, status: "In" },
        { status: "Out", outTime: new Date() }
      );

      res.status(200).json({
        success: true,
        message: `${result.modifiedCount} visitors checked out successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Error in bulk check-out:", error);
      res.status(500).json({ success: false, message: "Error in bulk check-out", error: error.message });
    }
  },
};
