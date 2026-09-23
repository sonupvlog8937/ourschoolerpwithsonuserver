const Account = require("../model/account.model");

const resources = new Set([
  "payment-requests",
  "event-collections",
  "income-category",
  "expense-category",
  "account-head",
  "income",
  "expenses",
  "income-report",
  "expense-report",
  "daily-monthly-report",
  "overall-summary",
  "group-wise-overall",
]);

const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid account resource" });
      }

      const records = await Account.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();

      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
        totalAmount: records.reduce((sum, item) => sum + Number(item.data?.amount || 0), 0),
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load account records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid account resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Account data is required" });
      }

      const record = await Account.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Account record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create account record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid account resource" });
      }

      const record = await Account.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Account record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update account record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid account resource" });
      }

      const record = await Account.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Account record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove account record", error: error.message });
    }
  },
};
