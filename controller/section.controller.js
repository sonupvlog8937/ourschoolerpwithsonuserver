const Section = require("../model/section.model");

const schoolId = (req) => req.user.schoolId || req.user.id;

const getSections = async (req, res) => {
  try {
    const sections = await Section.find({ school: schoolId(req) }).sort({ position: 1, name: 1 }).lean();
    return res.json({ success: true, data: sections });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to fetch sections", error: error.message }); }
};

const createSection = async (req, res) => {
  try {
    const { name, position = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Section name is required" });
    const section = await Section.create({ school: schoolId(req), name: name.trim(), position: Number(position) || 0 });
    return res.status(201).json({ success: true, message: "Section created successfully", data: section });
  } catch (error) { return res.status(error.code === 11000 ? 400 : 500).json({ success: false, message: error.code === 11000 ? "Section already exists" : "Unable to create section", error: error.message }); }
};

const updateSection = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.position !== undefined) updates.position = Number(req.body.position) || 0;
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    const section = await Section.findOneAndUpdate({ _id: req.params.id, school: schoolId(req) }, updates, { new: true, runValidators: true });
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    return res.json({ success: true, message: "Section updated successfully", data: section });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to update section", error: error.message }); }
};

const deleteSection = async (req, res) => {
  try {
    const section = await Section.findOneAndDelete({ _id: req.params.id, school: schoolId(req) });
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    return res.json({ success: true, message: "Section removed" });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to remove section", error: error.message }); }
};

const savePositions = async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : req.body.sections;
    await Promise.all((updates || []).map(({ id, position }) => Section.updateOne({ _id: id, school: schoolId(req) }, { position: Number(position) || 0 })));
    return res.json({ success: true, message: "Section positions saved" });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to save positions", error: error.message }); }
};

module.exports = { getSections, createSection, updateSection, deleteSection, savePositions };
