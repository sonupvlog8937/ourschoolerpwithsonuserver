const StudentInfoActivity = require("../model/studentInfoActivity.model");

const resources = new Set(["passout", "leaving-certificate", "dropout", "dropout-passout", "promote", "attendance-message", "remarks", "performance"]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student info resource" });
      const records = await StudentInfoActivity.find({ school: schoolId(req), resource: req.params.resource }).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: records });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load student info records", error: error.message }); }
  },
  create: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student info resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Student info data is required" });
      const record = await StudentInfoActivity.create({ school: schoolId(req), resource: req.params.resource, student: req.body.student || null, data: req.body, status: req.body.status || "Active", createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: "Student info record created" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create student info record", error: error.message }); }
  },
  update: async (req, res) => {
    try {
      const record = await StudentInfoActivity.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), resource: req.params.resource }, { data: req.body, status: req.body.status }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: "Student info record not found" });
      res.json({ success: true, data: record });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update student info record", error: error.message }); }
  },
  remove: async (req, res) => {
    try {
      const record = await StudentInfoActivity.findOneAndDelete({ _id: req.params.id, school: schoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Student info record not found" });
      res.json({ success: true, data: record._id });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to remove student info record", error: error.message }); }
  },
};