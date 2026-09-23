const StudentBank = require("../model/studentBank.model");

const resources = new Set(["wallets", "transactions"]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student bank resource" });
      const records = await StudentBank.find({ school: schoolId(req), resource: req.params.resource }).sort({ createdAt: -1 }).lean();
      const summary = req.params.resource === "wallets" ? { totalWallets: records.length, totalBalance: records.reduce((sum, record) => sum + (record.balance || 0), 0) } : { totalTransactions: records.length, totalCredits: records.filter((record) => record.data?.type === "Credit").reduce((sum, record) => sum + Number(record.data?.amount || 0), 0), totalDebits: records.filter((record) => record.data?.type === "Debit").reduce((sum, record) => sum + Number(record.data?.amount || 0), 0) };
      res.json({ success: true, data: records, summary });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load student bank records", error: error.message }); }
  },
  create: async (req, res) => {
    try {
      if (!resources.has(req.params.resource)) return res.status(400).json({ success: false, message: "Invalid student bank resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Bank data is required" });
      const amount = Number(req.body.amount || 0);
      const balance = req.params.resource === "wallets" ? Number(req.body.balance || 0) : 0;
      const record = await StudentBank.create({ school: schoolId(req), resource: req.params.resource, student: req.body.student || null, data: req.body, balance, status: req.body.status || "Active", createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: `${req.params.resource === "wallets" ? "Wallet" : "Transaction"} created`, amount });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create student bank record", error: error.message }); }
  },
  update: async (req, res) => {
    try {
      const updates = { data: req.body, status: req.body.status };
      if (req.params.resource === "wallets" && req.body.balance !== undefined) updates.balance = Number(req.body.balance);
      const record = await StudentBank.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), resource: req.params.resource }, updates, { new: true });
      if (!record) return res.status(404).json({ success: false, message: "Student bank record not found" });
      res.json({ success: true, data: record });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update student bank record", error: error.message }); }
  },
  remove: async (req, res) => {
    try {
      const record = await StudentBank.findOneAndDelete({ _id: req.params.id, school: schoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Student bank record not found" });
      res.json({ success: true, data: record._id });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to remove student bank record", error: error.message }); }
  },
};