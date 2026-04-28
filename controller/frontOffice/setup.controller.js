const { Purpose, ComplaintType, Source, Reference } = require("../../model/frontOffice/setup.model");
const mongoose = require("mongoose");

const toId = (id) => new mongoose.Types.ObjectId(id);

// ─── Helper: Get Model by Type ────────────────────────────────────────────────
const getModel = (type) => {
  const models = {
    purpose: Purpose,
    complaintType: ComplaintType,
    source: Source,
    reference: Reference,
  };
  return models[type];
};

// ─── Helper: Get Display Name ─────────────────────────────────────────────────
const getDisplayName = (type) => {
  const names = {
    purpose: "Purpose",
    complaintType: "Complaint Type",
    source: "Source",
    reference: "Reference",
  };
  return names[type] || "Item";
};

// ─── Generic CRUD Controller ──────────────────────────────────────────────────
const createGenericController = (type) => {
  const Model = getModel(type);
  const displayName = getDisplayName(type);

  return {
    // ── Create ─────────────────────────────────────────────────────────────────
    create: async (req, res) => {
      try {
        const schoolId = req.user.schoolId;
        const { name, description } = req.body;

        if (!name?.trim()) {
          return res.status(400).json({ success: false, message: `${displayName} name is required` });
        }

        // Check for duplicate
        const existing = await Model.findOne({
          school: schoolId,
          name: name.trim(),
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${displayName} with this name already exists`,
          });
        }

        const item = await Model.create({
          school: schoolId,
          name: name.trim(),
          description: description?.trim() || "",
        });

        return res.status(201).json({
          success: true,
          message: `${displayName} created successfully`,
          data: item,
        });
      } catch (err) {
        console.error(`create${displayName}:`, err);
        if (err.code === 11000) {
          return res.status(400).json({
            success: false,
            message: `${displayName} with this name already exists`,
          });
        }
        return res.status(500).json({
          success: false,
          message: `Unable to create ${displayName.toLowerCase()}`,
        });
      }
    },

    // ── Get All (paginated + searched) ─────────────────────────────────────────
    getAll: async (req, res) => {
      try {
        const schoolId = req.user.schoolId;
        const { search = "", page = 1, limit = 10 } = req.query;

        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const filter = { school: toId(schoolId) };

        if (search.trim()) {
          const rx = { $regex: search.trim(), $options: "i" };
          filter.$or = [{ name: rx }, { description: rx }];
        }

        const [data, total] = await Promise.all([
          Model.find(filter)
            .sort({ name: 1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit),
          Model.countDocuments(filter),
        ]);

        return res.json({
          success: true,
          data,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.max(Math.ceil(total / safeLimit), 1),
          },
        });
      } catch (err) {
        console.error(`getAll${displayName}:`, err);
        return res.status(500).json({
          success: false,
          message: `Unable to fetch ${displayName.toLowerCase()}s`,
        });
      }
    },

    // ── Get Single ─────────────────────────────────────────────────────────────
    getById: async (req, res) => {
      try {
        const item = await Model.findOne({
          _id: req.params.id,
          school: req.user.schoolId,
        });

        if (!item) {
          return res.status(404).json({
            success: false,
            message: `${displayName} not found`,
          });
        }

        return res.json({ success: true, data: item });
      } catch (err) {
        console.error(`get${displayName}ById:`, err);
        return res.status(500).json({
          success: false,
          message: `Unable to fetch ${displayName.toLowerCase()}`,
        });
      }
    },

    // ── Update ─────────────────────────────────────────────────────────────────
    update: async (req, res) => {
      try {
        const { name, description } = req.body;

        if (!name?.trim()) {
          return res.status(400).json({
            success: false,
            message: `${displayName} name is required`,
          });
        }

        // Check for duplicate (excluding current item)
        const existing = await Model.findOne({
          school: req.user.schoolId,
          name: name.trim(),
          _id: { $ne: req.params.id },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${displayName} with this name already exists`,
          });
        }

        const updated = await Model.findOneAndUpdate(
          { _id: req.params.id, school: req.user.schoolId },
          {
            name: name.trim(),
            description: description?.trim() || "",
          },
          { new: true }
        );

        if (!updated) {
          return res.status(404).json({
            success: false,
            message: `${displayName} not found`,
          });
        }

        return res.json({
          success: true,
          message: `${displayName} updated successfully`,
          data: updated,
        });
      } catch (err) {
        console.error(`update${displayName}:`, err);
        if (err.code === 11000) {
          return res.status(400).json({
            success: false,
            message: `${displayName} with this name already exists`,
          });
        }
        return res.status(500).json({
          success: false,
          message: `Unable to update ${displayName.toLowerCase()}`,
        });
      }
    },

    // ── Delete ─────────────────────────────────────────────────────────────────
    delete: async (req, res) => {
      try {
        const deleted = await Model.findOneAndDelete({
          _id: req.params.id,
          school: req.user.schoolId,
        });

        if (!deleted) {
          return res.status(404).json({
            success: false,
            message: `${displayName} not found`,
          });
        }

        return res.json({
          success: true,
          message: `${displayName} deleted successfully`,
        });
      } catch (err) {
        console.error(`delete${displayName}:`, err);
        return res.status(500).json({
          success: false,
          message: `Unable to delete ${displayName.toLowerCase()}`,
        });
      }
    },
  };
};

// ─── Export Controllers ───────────────────────────────────────────────────────
module.exports = {
  purpose: createGenericController("purpose"),
  complaintType: createGenericController("complaintType"),
  source: createGenericController("source"),
  reference: createGenericController("reference"),
};
