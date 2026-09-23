const StudentActivity = require("../model/studentActivity.model");

const resources = new Set([
  "complaint-type", "complaint-books", "postal", "visitor-purposes", "visitors-books", "visitor-qr-code",
  "gate-pass", "admission-query", "seat-matrix", "enquiry-qr-code", "student-registration", "student-id-card", "achievements",
]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student activity resource" });
      const records = await StudentActivity.find({ school: schoolId(req), resource: req.params.resource }).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: records });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load activity records", error: error.message }); }
  },
  create: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student activity resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Activity data is required" });
      const record = await StudentActivity.create({ school: schoolId(req), resource: req.params.resource, data: req.body, status: req.body.status || "Active", createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: "Activity record created" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create activity record", error: error.message }); }
  },
  update: async (req, res) => {
    try {
      const record = await StudentActivity.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), resource: req.params.resource }, { data: req.body, status: req.body.status }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: "Activity record not found" });
      res.json({ success: true, data: record, message: "Activity record updated" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update activity record", error: error.message }); }
  },
  remove: async (req, res) => {
    try {
      const record = await StudentActivity.findOneAndDelete({ _id: req.params.id, school: schoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Activity record not found" });
      res.json({ success: true, data: record._id });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to remove activity record", error: error.message }); }
  },
};