const StoreRoom = require("../model/storeRoom.model");

const resources = new Set(["dashboard", "rooms", "items", "current-stock", "transactions"]);
const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid store room resource" });
      }

      const records = await StoreRoom.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();
      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
        totalItems: records.reduce((sum, item) => sum + Number(item.data?.quantity || 0), 0),
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load store room records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid store room resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Store room data is required" });
      }

      const record = await StoreRoom.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Store room record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create store room record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid store room resource" });
      }

      const record = await StoreRoom.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Store room record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update store room record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid store room resource" });
      }

      const record = await StoreRoom.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Store room record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove store room record", error: error.message });
    }
  },
};
