const resources = {
  transport: require("../model/transportResource.model"),
  hostel: require("../model/hostelResource.model"),
  library: require("../model/libraryResource.model"),
  onlineClasses: require("../model/onlineClassResource.model"),
  academicContent: require("../model/academicContentResource.model"),
  importExport: require("../model/importExportResource.model"),
  accessControl: require("../model/accessControlResource.model"),
  parentAccounts: require("../model/parentAccountResource.model"),
  websiteConfiguration: require("../model/websiteConfigurationResource.model"),
  behaviour: require("../model/behaviourResource.model"),
};

const getModel = (key) => resources[key];

exports.list = (modelKey) => async (req, res) => {
  try {
    const model = getModel(modelKey);
    if (!model) return res.status(404).json({ success: false, message: "Resource not found" });

    const { resource } = req.params;
    const schoolId = req.user?.schoolId || req.user?.school || null;
    const records = await model.find({ school: schoolId, resource }).sort({ createdAt: -1 });
    const summary = {};

    res.json({ success: true, data: records, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = (modelKey) => async (req, res) => {
  try {
    const model = getModel(modelKey);
    if (!model) return res.status(404).json({ success: false, message: "Resource not found" });

    const { resource } = req.params;
    const schoolId = req.user?.schoolId || req.user?.school || null;

    const data = await model.create({
      school: schoolId,
      resource,
      data: req.body,
      createdBy: req.user?._id || null,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = (modelKey) => async (req, res) => {
  try {
    const model = getModel(modelKey);
    if (!model) return res.status(404).json({ success: false, message: "Resource not found" });

    const record = await model.findByIdAndUpdate(req.params.id, { data: req.body }, { new: true });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = (modelKey) => async (req, res) => {
  try {
    const model = getModel(modelKey);
    if (!model) return res.status(404).json({ success: false, message: "Resource not found" });

    const deleted = await model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
