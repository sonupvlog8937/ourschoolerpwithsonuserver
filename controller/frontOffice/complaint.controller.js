const Complaint = require("../../model/frontOffice/complaint.model");
const { ComplaintType, Source } = require("../../model/frontOffice/setup.model");
const mongoose  = require("mongoose");

const toId = (id) => new mongoose.Types.ObjectId(id);

module.exports = {
  // ── Create ─────────────────────────────────────────────────────────────────
  createComplaint: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { complaintBy, phone, date, complaintType, source,
              description, actionTaken, assignedTo, note, attachment, status, priority } = req.body;

      if (!complaintBy?.trim())
        return res.status(400).json({ success: false, message: "Complain By is required" });

      // Fetch dynamic options to validate or provide fallback
      const [complaintTypes, sources] = await Promise.all([
        ComplaintType.find({ school: schoolId }).select("name").lean(),
        Source.find({ school: schoolId }).select("name").lean(),
      ]);
      const complaintTypeOptions = complaintTypes.map(ct => ct.name);
      const sourceOptions = sources.map(s => s.name);

      // Use provided value if valid, otherwise use first option or fallback
      const finalComplaintType = complaintType && complaintTypeOptions.includes(complaintType) 
        ? complaintType 
        : (complaintTypeOptions[0] || "Other");
      
      const finalSource = source && sourceOptions.includes(source)
        ? source
        : (sourceOptions[0] || "Other");

      const complaint = await Complaint.create({
        school: schoolId,
        complaintBy: complaintBy.trim(),
        phone:        phone?.trim()        || "",
        date:         date ? new Date(date) : new Date(),
        complaintType: finalComplaintType,
        source:        finalSource,
        description:   description?.trim() || "",
        actionTaken:   actionTaken?.trim() || "",
        assignedTo:    assignedTo?.trim()  || "",
        note:          note?.trim()        || "",
        attachment:    attachment?.trim()  || "",
        status:        status              || "Open",
        priority:      priority            || "Medium",
      });

      return res.status(201).json({ success: true, message: "Complaint created successfully", data: complaint });
    } catch (err) {
      console.error("createComplaint:", err);
      return res.status(500).json({ success: false, message: "Unable to create complaint", error: err.message });
    }
  },

  // ── Get All (paginated + filtered + searched) ──────────────────────────────
  getAllComplaints: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        search = "",
        status = "all",
        complaintType = "all",
        source = "all",
        priority = "all",
        date = "",
        page  = 1,
        limit = 10,
        sortBy = "date_desc",
      } = req.query;

      const safePage  = Math.max(parseInt(page,  10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

      const filter = { school: toId(schoolId) };
      if (status        !== "all") filter.status        = status;
      if (complaintType !== "all") filter.complaintType = complaintType;
      if (source        !== "all") filter.source        = source;
      if (priority      !== "all") filter.priority      = priority;

      if (date) {
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const e = new Date(date); e.setHours(23, 59, 59, 999);
        filter.date = { $gte: d, $lte: e };
      }

      if (search.trim()) {
        const rx = { $regex: search.trim(), $options: "i" };
        filter.$or = [
          { complaintBy: rx }, { phone: rx }, { description: rx },
          { actionTaken: rx }, { assignedTo: rx }, { note: rx },
        ];
      }

      const sortMap = {
        date_desc:        { date: -1 },
        date_asc:         { date:  1 },
        complaintNo_desc: { complaintNo: -1 },
        complaintNo_asc:  { complaintNo:  1 },
        name_asc:         { complaintBy:  1, date: -1 },
        name_desc:        { complaintBy: -1, date: -1 },
      };
      const sort = sortMap[sortBy] || sortMap.date_desc;

      // Fetch dynamic options from Setup
      const [complaintTypes, sources] = await Promise.all([
        ComplaintType.find({ school: toId(schoolId) }).select("name").lean(),
        Source.find({ school: toId(schoolId) }).select("name").lean(),
      ]);
      const complaintTypeOptions = complaintTypes.map(ct => ct.name);
      const sourceOptions = sources.map(s => s.name);

      const [complaints, total] = await Promise.all([
        Complaint.find(filter).sort(sort).skip((safePage - 1) * safeLimit).limit(safeLimit),
        Complaint.countDocuments(filter),
      ]);

      // Stats (all-time, not filtered)
      const [open, inProgress, resolved, closed, high, medium, low] = await Promise.all([
        Complaint.countDocuments({ school: toId(schoolId), status: "Open" }),
        Complaint.countDocuments({ school: toId(schoolId), status: "In Progress" }),
        Complaint.countDocuments({ school: toId(schoolId), status: "Resolved" }),
        Complaint.countDocuments({ school: toId(schoolId), status: "Closed" }),
        Complaint.countDocuments({ school: toId(schoolId), priority: "High" }),
        Complaint.countDocuments({ school: toId(schoolId), priority: "Medium" }),
        Complaint.countDocuments({ school: toId(schoolId), priority: "Low" }),
      ]);

      return res.json({
        success: true,
        data: complaints,
        stats: {
          total: open + inProgress + resolved + closed,
          open, inProgress, resolved, closed,
          high, medium, low,
        },
        complaintTypeOptions, // Dynamic from Setup
        sourceOptions,        // Dynamic from Setup
        pagination: {
          total,
          page:  safePage,
          limit: safeLimit,
          pages: Math.max(Math.ceil(total / safeLimit), 1),
        },
      });
    } catch (err) {
      console.error("getAllComplaints:", err);
      return res.status(500).json({ success: false, message: "Unable to fetch complaints" });
    }
  },

  // ── Get Single ─────────────────────────────────────────────────────────────
  getComplaintById: async (req, res) => {
    try {
      const c = await Complaint.findOne({ _id: req.params.id, school: req.user.schoolId });
      if (!c) return res.status(404).json({ success: false, message: "Complaint not found" });
      return res.json({ success: true, data: c });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch complaint" });
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  updateComplaint: async (req, res) => {
    try {
      const { complaintBy, phone, date, complaintType, source,
              description, actionTaken, assignedTo, note, attachment, status, priority } = req.body;

      const updated = await Complaint.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        {
          ...(complaintBy  && { complaintBy:  complaintBy.trim() }),
          ...(phone        !== undefined && { phone:        phone.trim() }),
          ...(date         && { date:         new Date(date) }),
          ...(complaintType && { complaintType }),
          ...(source        && { source }),
          ...(description  !== undefined && { description:  description.trim() }),
          ...(actionTaken  !== undefined && { actionTaken:  actionTaken.trim() }),
          ...(assignedTo   !== undefined && { assignedTo:   assignedTo.trim() }),
          ...(note         !== undefined && { note:         note.trim() }),
          ...(attachment   !== undefined && { attachment:   attachment.trim() }),
          ...(status        && { status }),
          ...(priority      && { priority }),
        },
        { new: true }
      );

      if (!updated) return res.status(404).json({ success: false, message: "Complaint not found" });
      return res.json({ success: true, message: "Complaint updated successfully", data: updated });
    } catch (err) {
      console.error("updateComplaint:", err);
      return res.status(500).json({ success: false, message: "Unable to update complaint" });
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteComplaint: async (req, res) => {
    try {
      const deleted = await Complaint.findOneAndDelete({ _id: req.params.id, school: req.user.schoolId });
      if (!deleted) return res.status(404).json({ success: false, message: "Complaint not found" });
      return res.json({ success: true, message: "Complaint deleted successfully" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete complaint" });
    }
  },

  // ── Bulk Delete ─────────────────────────────────────────────────────────────
  bulkDelete: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res.status(400).json({ success: false, message: "No IDs provided" });
      const result = await Complaint.deleteMany({ _id: { $in: ids }, school: req.user.schoolId });
      return res.json({ success: true, message: `${result.deletedCount} complaints deleted` });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete complaints" });
    }
  },

  // ── Quick Status Update ─────────────────────────────────────────────────────
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const valid = ["Open", "In Progress", "Resolved", "Closed"];
      if (!valid.includes(status))
        return res.status(400).json({ success: false, message: "Invalid status" });

      const updated = await Complaint.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        { status },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Complaint not found" });
      return res.json({ success: true, message: "Status updated", data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to update status" });
    }
  },
};
