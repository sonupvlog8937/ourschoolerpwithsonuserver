const StudentProfile = require("../model/studentProfile.model");

const resources = new Set(["pillar", "event-type", "event-master", "entry", "verification", "sports-profile", "sports-setup"]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student profile resource" });
      const records = await StudentProfile.find({ school: schoolId(req), resource: req.params.resource }).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: records });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load student profile records", error: error.message }); }
  },
  create: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student profile resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Profile data is required" });
      const record = await StudentProfile.create({ school: schoolId(req), resource: req.params.resource, data: req.body, student: req.body.student || null, status: req.body.status || "Active", createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: "Student profile record created" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create student profile record", error: error.message }); }
  },
  update: async (req, res) => {
    try {
      const record = await StudentProfile.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), resource: req.params.resource }, { data: req.body, status: req.body.status }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: "Student profile record not found" });
      res.json({ success: true, data: record, message: "Student profile record updated" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update student profile record", error: error.message }); }
  },
  remove: async (req, res) => {
    try {
      const record = await StudentProfile.findOneAndDelete({ _id: req.params.id, school: schoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Student profile record not found" });
      res.json({ success: true, data: record._id });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to remove student profile record", error: error.message }); }
  },
};