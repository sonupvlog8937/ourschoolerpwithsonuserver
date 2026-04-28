const PhoneCallLog = require("../../model/frontOffice/phoneCallLog.model");
const mongoose = require("mongoose");

module.exports = {
  // ── Create ────────────────────────────────────────────────────────────────
  createLog: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, phone, date, description, callType, followUpDate, duration, note } = req.body;

      if (!name?.trim())  return res.status(400).json({ success: false, message: "Name is required" });
      if (!phone?.trim()) return res.status(400).json({ success: false, message: "Phone is required" });

      const log = await PhoneCallLog.create({
        school: schoolId,
        name: name.trim(),
        phone: phone.trim(),
        date: date ? new Date(date) : new Date(),
        description: description?.trim() || "",
        callType: callType || "Incoming",
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        duration: duration?.trim() || "",
        note: note?.trim() || "",
      });

      return res.status(201).json({ success: true, message: "Call log created successfully", data: log });
    } catch (err) {
      console.error("createLog error:", err);
      return res.status(500).json({ success: false, message: "Unable to create call log" });
    }
  },

  // ── Get All (paginated + filtered) ────────────────────────────────────────
  getAllLogs: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        search = "",
        callType = "all",
        date = "",
        followUpDate = "",
        page = 1,
        limit = 10,
        sortBy = "date_desc",
      } = req.query;

      const safePage  = Math.max(parseInt(page,  10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

      const filter = { school: new mongoose.Types.ObjectId(schoolId) };

      if (callType !== "all") filter.callType = callType;

      if (date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(date);
        dEnd.setHours(23, 59, 59, 999);
        filter.date = { $gte: d, $lte: dEnd };
      }

      if (followUpDate) {
        const fd = new Date(followUpDate);
        fd.setHours(0, 0, 0, 0);
        const fdEnd = new Date(followUpDate);
        fdEnd.setHours(23, 59, 59, 999);
        filter.followUpDate = { $gte: fd, $lte: fdEnd };
      }

      if (search.trim()) {
        const rx = { $regex: search.trim(), $options: "i" };
        filter.$or = [
          { name: rx },
          { phone: rx },
          { description: rx },
          { note: rx },
        ];
      }

      const sortMap = {
        date_desc:       { date: -1 },
        date_asc:        { date:  1 },
        name_asc:        { name:  1, date: -1 },
        name_desc:       { name: -1, date: -1 },
        followUpDate_asc:{ followUpDate: 1, date: -1 },
      };
      const sort = sortMap[sortBy] || sortMap.date_desc;

      const [logs, total] = await Promise.all([
        PhoneCallLog.find(filter).sort(sort).skip((safePage - 1) * safeLimit).limit(safeLimit),
        PhoneCallLog.countDocuments(filter),
      ]);

      // Stats for current school (all-time, not filtered)
      const [incomingCount, outgoingCount, followUpCount] = await Promise.all([
        PhoneCallLog.countDocuments({ school: new mongoose.Types.ObjectId(schoolId), callType: "Incoming" }),
        PhoneCallLog.countDocuments({ school: new mongoose.Types.ObjectId(schoolId), callType: "Outgoing" }),
        PhoneCallLog.countDocuments({
          school: new mongoose.Types.ObjectId(schoolId),
          followUpDate: { $gte: new Date() },
        }),
      ]);

      return res.json({
        success: true,
        data: logs,
        stats: { total: incomingCount + outgoingCount, incomingCount, outgoingCount, followUpCount },
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          pages: Math.max(Math.ceil(total / safeLimit), 1),
        },
      });
    } catch (err) {
      console.error("getAllLogs error:", err);
      return res.status(500).json({ success: false, message: "Unable to fetch call logs" });
    }
  },

  // ── Get Single ────────────────────────────────────────────────────────────
  getLogById: async (req, res) => {
    try {
      const log = await PhoneCallLog.findOne({ _id: req.params.id, school: req.user.schoolId });
      if (!log) return res.status(404).json({ success: false, message: "Log not found" });
      return res.json({ success: true, data: log });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch log" });
    }
  },

  // ── Update ────────────────────────────────────────────────────────────────
  updateLog: async (req, res) => {
    try {
      const { name, phone, date, description, callType, followUpDate, duration, note } = req.body;

      const updated = await PhoneCallLog.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        {
          ...(name        && { name: name.trim() }),
          ...(phone       && { phone: phone.trim() }),
          ...(date        && { date: new Date(date) }),
          ...(description !== undefined && { description: description.trim() }),
          ...(callType    && { callType }),
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          ...(duration    !== undefined && { duration: duration.trim() }),
          ...(note        !== undefined && { note: note.trim() }),
        },
        { new: true }
      );

      if (!updated) return res.status(404).json({ success: false, message: "Log not found" });
      return res.json({ success: true, message: "Call log updated successfully", data: updated });
    } catch (err) {
      console.error("updateLog error:", err);
      return res.status(500).json({ success: false, message: "Unable to update call log" });
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteLog: async (req, res) => {
    try {
      const deleted = await PhoneCallLog.findOneAndDelete({ _id: req.params.id, school: req.user.schoolId });
      if (!deleted) return res.status(404).json({ success: false, message: "Log not found" });
      return res.json({ success: true, message: "Call log deleted successfully" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete call log" });
    }
  },

  // ── Bulk Delete ───────────────────────────────────────────────────────────
  bulkDelete: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ success: false, message: "No IDs provided" });

      const result = await PhoneCallLog.deleteMany({ _id: { $in: ids }, school: req.user.schoolId });
      return res.json({ success: true, message: `${result.deletedCount} logs deleted` });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete logs" });
    }
  },
};
