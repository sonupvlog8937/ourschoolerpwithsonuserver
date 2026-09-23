const InventoryResource = require("../model/inventoryResource.model");

const resources = new Set([
  "item-category",
  "add-item",
  "item-bundle",
  "supplier-list",
  "purchase",
  "sell",
  "sell-collection",
  "cancelled-invoice",
  "return-invoice",
  "item-receive-sell"
]);

const schoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid inventory resource" });
      }

      const records = await InventoryResource.find({ school: schoolId(req), resource }).sort({ createdAt: -1 }).lean();
      const summary = {
        totalRecords: records.length,
        active: records.filter((item) => item.status === "Active").length,
        pending: records.filter((item) => item.status === "Pending").length,
        totalItems: records.reduce((sum, item) => sum + Number(item.data?.quantity || 0), 0),
      };

      return res.json({ success: true, data: records, summary });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to load inventory records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid inventory resource" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, message: "Inventory data is required" });
      }

      const record = await InventoryResource.create({
        school: schoolId(req),
        resource,
        data: req.body,
        status: req.body.status || "Active",
        createdBy: req.user.id,
      });

      return res.status(201).json({ success: true, data: record, message: "Inventory record created" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to create inventory record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid inventory resource" });
      }

      const record = await InventoryResource.findOneAndUpdate(
        { _id: id, school: schoolId(req), resource },
        { data: req.body, status: req.body.status },
        { new: true }
      );

      if (!record) {
        return res.status(404).json({ success: false, message: "Inventory record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to update inventory record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const { resource, id } = req.params;
      if (!resources.has(resource)) {
        return res.status(400).json({ success: false, message: "Invalid inventory resource" });
      }

      const record = await InventoryResource.findOneAndDelete({ _id: id, school: schoolId(req), resource });
      if (!record) {
        return res.status(404).json({ success: false, message: "Inventory record not found" });
      }

      return res.json({ success: true, data: record._id });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Unable to remove inventory record", error: error.message });
    }
  },
};
