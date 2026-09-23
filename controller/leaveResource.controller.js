const LeaveResource = require("../model/leaveResource.model");

const resources = new Set([
  "type",
  "define-policy",
  "apply-staff",
  "staff-requests",
  "staff-balance",
]);

const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid leave resource" });
      }

      const records = await LeaveResource.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();
      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load leave records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid leave resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Leave data is required" });
      }

      const record = await LeaveResource.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user?.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Leave record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create leave record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid leave resource" });
      }

      const record = await LeaveResource.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Leave record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update leave record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid leave resource" });
      }

      const record = await LeaveResource.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Leave record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove leave record", error: error.message });
    }
  },
};
