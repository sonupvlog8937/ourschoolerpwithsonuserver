const StudentFeeActivity = require("../model/studentFeeActivity.model");

const resources = new Set(["schedule-class-wise", "term", "type", "rebate-rules", "group", "multi-group-assign", "back-dues", "adjustment-approvals", "reminder", "demand-notice", "demand-notice-termwise", "promote-structure", "promote-back-dues"]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student fee resource" });
      const records = await StudentFeeActivity.find({ school: schoolId(req), resource: req.params.resource }).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: records });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load fee records", error: error.message }); }
  },
  create: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student fee resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Fee data is required" });
      const record = await StudentFeeActivity.create({ school: schoolId(req), resource: req.params.resource, data: req.body, status: req.body.status || "Active", createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: "Fee record created" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create fee record", error: error.message }); }
  },
  update: async (req, res) => {
    try {
      const record = await StudentFeeActivity.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), resource: req.params.resource }, { data: req.body, status: req.body.status }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: "Fee record not found" });
      res.json({ success: true, data: record });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update fee record", error: error.message }); }
  },
  remove: async (req, res) => {
    try {
      const record = await StudentFeeActivity.findOneAndDelete({ _id: req.params.id, school: schoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Fee record not found" });
      res.json({ success: true, data: record._id });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to remove fee record", error: error.message }); }
  },
};