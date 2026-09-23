const Exam = require("../model/exam.model");

const resources = new Set([
  "terms",
  "common-type",
  "type",
  "grading-system",
  "system",
  "co-scholastic-grade",
  "co-scholastic-area",
  "schedule",
  "online-exam",
  "hall-ticket",
  "marks-multi-subject",
  "subject-remarks-all",
  "subject-remarks",
  "marks",
  "co-scholastic-marks",
  "marks-report",
  "report-card",
  "promote-structure",
  "test-assignment",
  "bulk-attendance-update",
  "system-config",
]);

const getSchoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid exam resource" });
      }

      const records = await Exam.find({ school: getSchoolId(req), resource }).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: records });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to load exam records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid exam resource" });
      }
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Exam data is required" });
      }

      const record = await Exam.create({
        school: getSchoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user.id,
      });

      res.status(201).json({ success: true, data: record, message: "Exam record created" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to create exam record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const record = await Exam.findOneAndUpdate(
        { _id: req.params.id, school: getSchoolId(req), resource: req.params.resource },
        { data: req.body, status: req.body.status },
        { new: true, runValidators: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Exam record not found" });
      }

      res.json({ success: true, data: record, message: "Exam record updated" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to update exam record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const record = await Exam.findOneAndDelete({ _id: req.params.id, school: getSchoolId(req), resource: req.params.resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Exam record not found" });
      }
      res.json({ success: true, data: record._id, message: "Exam record removed" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to remove exam record", error: error.message });
    }
  },
};
