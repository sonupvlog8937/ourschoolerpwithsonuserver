const PostalRecord = require("../../model/frontOffice/postalRecord.model");
const mongoose = require("mongoose");

// ─── helpers ──────────────────────────────────────────────────────────────────
const toObjId = (id) => new mongoose.Types.ObjectId(id);

module.exports = {
  // ── Create ─────────────────────────────────────────────────────────────────
  createRecord: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { type, fromTo, referenceNo, address, date, toTitle, note, attachment } = req.body;

      if (!type || !["Receive", "Dispatch"].includes(type))
        return res.status(400).json({ success: false, message: "type must be Receive or Dispatch" });
      if (!fromTo?.trim())
        return res.status(400).json({ success: false, message: `${type === "Receive" ? "From Title" : "To Title"} is required` });

      const record = await PostalRecord.create({
        school: schoolId,
        type,
        fromTo: fromTo.trim(),
        referenceNo: referenceNo?.trim() || "",
        address: address?.trim() || "",
        date: date ? new Date(date) : new Date(),
        toTitle: toTitle?.trim() || "",
        note: note?.trim() || "",
        attachment: attachment?.trim() || "",
      });

      return res.status(201).json({ success: true, message: `Postal ${type} record created`, data: record });
    } catch (err) {
      console.error("createRecord:", err);
      return res.status(500).json({ success: false, message: "Unable to create record" });
    }
  },

  // ── Get All (paginated + filtered) ─────────────────────────────────────────
  getAllRecords: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        type,
        search = "",
        date = "",
        page = 1,
        limit = 10,
        sortBy = "date_desc",
      } = req.query;

      const safePage  = Math.max(parseInt(page,  10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

      const filter = { school: toObjId(schoolId) };
      if (type && ["Receive", "Dispatch"].includes(type)) filter.type = type;

      if (date) {
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const dEnd = new Date(date); dEnd.setHours(23, 59, 59, 999);
        filter.date = { $gte: d, $lte: dEnd };
      }

      if (search.trim()) {
        const rx = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ fromTo: rx }, { toTitle: rx }, { referenceNo: rx }, { address: rx }, { note: rx }];
      }

      const sortMap = {
        date_desc:  { date: -1 },
        date_asc:   { date:  1 },
        fromTo_asc: { fromTo: 1, date: -1 },
        fromTo_desc:{ fromTo: -1, date: -1 },
      };
      const sort = sortMap[sortBy] || sortMap.date_desc;

      const [records, total, receiveCount, dispatchCount] = await Promise.all([
        PostalRecord.find(filter).sort(sort).skip((safePage - 1) * safeLimit).limit(safeLimit),
        PostalRecord.countDocuments(filter),
        PostalRecord.countDocuments({ school: toObjId(schoolId), type: "Receive" }),
        PostalRecord.countDocuments({ school: toObjId(schoolId), type: "Dispatch" }),
      ]);

      return res.json({
        success: true,
        data: records,
        stats: { total: receiveCount + dispatchCount, receiveCount, dispatchCount },
        pagination: { total, page: safePage, limit: safeLimit, pages: Math.max(Math.ceil(total / safeLimit), 1) },
      });
    } catch (err) {
      console.error("getAllRecords:", err);
      return res.status(500).json({ success: false, message: "Unable to fetch records" });
    }
  },

  // ── Get Single ─────────────────────────────────────────────────────────────
  getRecordById: async (req, res) => {
    try {
      const record = await PostalRecord.findOne({ _id: req.params.id, school: req.user.schoolId });
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });
      return res.json({ success: true, data: record });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to fetch record" });
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  updateRecord: async (req, res) => {
    try {
      const { fromTo, referenceNo, address, date, toTitle, note, attachment } = req.body;
      const updated = await PostalRecord.findOneAndUpdate(
        { _id: req.params.id, school: req.user.schoolId },
        {
          ...(fromTo       && { fromTo: fromTo.trim() }),
          ...(referenceNo  !== undefined && { referenceNo: referenceNo.trim() }),
          ...(address      !== undefined && { address: address.trim() }),
          ...(date         && { date: new Date(date) }),
          ...(toTitle      !== undefined && { toTitle: toTitle.trim() }),
          ...(note         !== undefined && { note: note.trim() }),
          ...(attachment   !== undefined && { attachment: attachment.trim() }),
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
      return res.json({ success: true, message: "Record updated", data: updated });
    } catch (err) {
      console.error("updateRecord:", err);
      return res.status(500).json({ success: false, message: "Unable to update record" });
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteRecord: async (req, res) => {
    try {
      const deleted = await PostalRecord.findOneAndDelete({ _id: req.params.id, school: req.user.schoolId });
      if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
      return res.json({ success: true, message: "Record deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete record" });
    }
  },

  // ── Bulk Delete ─────────────────────────────────────────────────────────────
  bulkDelete: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res.status(400).json({ success: false, message: "No IDs provided" });
      const result = await PostalRecord.deleteMany({ _id: { $in: ids }, school: req.user.schoolId });
      return res.json({ success: true, message: `${result.deletedCount} records deleted` });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Unable to delete records" });
    }
  },
};
