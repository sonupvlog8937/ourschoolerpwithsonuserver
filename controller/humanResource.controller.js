const HumanResource = require("../model/humanResource.model");

const resources = new Set([
  "add-staff",
  "manage-staff",
  "payroll",
  "staff-attendance",
]);

const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid human resource resource" });
      }

      const records = await HumanResource.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();

      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
        totalStaff: records.length,
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load human resource records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid human resource resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Human resource data is required" });
      }

      const record = await HumanResource.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user?.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Human resource record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create human resource record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid human resource resource" });
      }

      const record = await HumanResource.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Human resource record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update human resource record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid human resource resource" });
      }

      const record = await HumanResource.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Human resource record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove human resource record", error: error.message });
    }
  },
};
