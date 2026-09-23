const MasterConfiguration = require("../model/masterConfiguration.model");

const MODULES = [
  "session", "school-info", "rooms-assign", "app-version", "house-name", "hobby-group", "religion", "disabilities", "designation", "department", "library-setting", "general-settings", "online-payment", "payment-method", "sms-settings", "sms-template", "biometric-device", "school-shifts", "working-days-template", "school-config", "boards", "enquiry-statuses", "enquiry-sources",
];

const validModule = (module) => MODULES.includes(module);
const schoolId = (req) => req.user.schoolId || req.user.id;

const getModule = async (req, res) => {
  try {
    if (!validModule(req.params.module)) return res.status(400).json({ success: false, message: "Invalid master module" });
    const data = await MasterConfiguration.find({ school: schoolId(req), module: req.params.module }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch master configuration", error: error.message }); }
};

const createModuleRecord = async (req, res) => {
  try {
    if (!validModule(req.params.module)) return res.status(400).json({ success: false, message: "Invalid master module" });
    const { name = "", data = {}, active = true } = req.body;
    const record = await MasterConfiguration.create({ school: schoolId(req), module: req.params.module, name: String(name).trim(), data, active });
    return res.status(201).json({ success: true, message: "Configuration saved", data: record });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to save master configuration", error: error.message }); }
};

const updateModuleRecord = async (req, res) => {
  try {
    const record = await MasterConfiguration.findOneAndUpdate({ _id: req.params.id, school: schoolId(req), module: req.params.module }, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ success: false, message: "Configuration not found" });
    return res.json({ success: true, message: "Configuration updated", data: record });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to update master configuration", error: error.message }); }
};

const deleteModuleRecord = async (req, res) => {
  try {
    const record = await MasterConfiguration.findOneAndDelete({ _id: req.params.id, school: schoolId(req), module: req.params.module });
    if (!record) return res.status(404).json({ success: false, message: "Configuration not found" });
    return res.json({ success: true, message: "Configuration removed" });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to delete master configuration", error: error.message }); }
};

module.exports = { MODULES, getModule, createModuleRecord, updateModuleRecord, deleteModuleRecord };
