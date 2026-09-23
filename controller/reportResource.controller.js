const ReportResource = require("../model/reportResource.model");

const resources = new Set([
  "downloads",
  "campus-feed-engagement",
  "student-leave",
  "receipt-wise-fee",
  "fee-collected",
  "fee-discount",
  "fee-type-term-wise",
  "datewise-fee-collected",
  "termwise-fee-collected",
  "fee-balance",
  "termwise-balance",
  "fee-type-termwise-balance",
  "fee-adjustment",
  "classwise-balance-summary",
  "term-wise-fee",
  "student-more-balance",
  "fee-due-date",
  "fee-rebate",
  "deleted-fee-receipt",
  "sell-summary",
  "purchase-summary",
  "inventory-stock",
  "route-student",
  "transport-stoppage-fee",
]);

const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid report resource" });
      }

      const records = await ReportResource.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();
      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load report records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid report resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Report data is required" });
      }

      const record = await ReportResource.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user?.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Report record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create report record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid report resource" });
      }

      const record = await ReportResource.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Report record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update report record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid report resource" });
      }

      const record = await ReportResource.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Report record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove report record", error: error.message });
    }
  },
};
