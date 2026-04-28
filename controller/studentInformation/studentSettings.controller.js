const StudentCategory = require('../../model/studentInformation/studentCategory.model');
const StudentHouse = require('../../model/studentInformation/studentHouse.model');
const DisableReason = require('../../model/studentInformation/disableReason.model');
const SchoolSettings = require('../../model/studentInformation/schoolSettings.model');

// ─── STUDENT CATEGORIES ───────────────────────────────────────────────────────

const getCategories = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { search = '' } = req.query;
    const filter = { school: schoolId };
    if (search) filter.name = { $regex: search.trim(), $options: 'i' };
    const data = await StudentCategory.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getCategories error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });

    // Auto-generate categoryId
    const count = await StudentCategory.countDocuments({ school: schoolId });
    const category = await StudentCategory.create({ school: schoolId, name: name.trim(), categoryId: count + 1 });
    return res.status(201).json({ success: true, message: 'Category created successfully.', data: category });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Category already exists.' });
    console.error('createCategory error', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });

    const category = await StudentCategory.findOneAndUpdate(
      { _id: req.params.id, school: schoolId },
      { name: name.trim() },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.status(200).json({ success: true, message: 'Category updated successfully.', data: category });
  } catch (err) {
    console.error('updateCategory error', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const deleted = await StudentCategory.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('deleteCategory error', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
};

// ─── STUDENT HOUSES ───────────────────────────────────────────────────────────

const getHouses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { search = '' } = req.query;
    const filter = { school: schoolId };
    if (search) filter.name = { $regex: search.trim(), $options: 'i' };
    const data = await StudentHouse.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getHouses error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch houses.' });
  }
};

const createHouse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'House name is required.' });

    const count = await StudentHouse.countDocuments({ school: schoolId });
    const house = await StudentHouse.create({
      school: schoolId,
      name: name.trim(),
      description: description?.trim() || '',
      houseId: count + 1,
    });
    return res.status(201).json({ success: true, message: 'House created successfully.', data: house });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'House already exists.' });
    console.error('createHouse error', err);
    return res.status(500).json({ success: false, message: 'Failed to create house.' });
  }
};

const updateHouse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'House name is required.' });

    const house = await StudentHouse.findOneAndUpdate(
      { _id: req.params.id, school: schoolId },
      { name: name.trim(), description: description?.trim() || '' },
      { new: true }
    );
    if (!house) return res.status(404).json({ success: false, message: 'House not found.' });
    return res.status(200).json({ success: true, message: 'House updated successfully.', data: house });
  } catch (err) {
    console.error('updateHouse error', err);
    return res.status(500).json({ success: false, message: 'Failed to update house.' });
  }
};

const deleteHouse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const deleted = await StudentHouse.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: 'House not found.' });
    return res.status(200).json({ success: true, message: 'House deleted successfully.' });
  } catch (err) {
    console.error('deleteHouse error', err);
    return res.status(500).json({ success: false, message: 'Failed to delete house.' });
  }
};

// ─── DISABLE REASONS ──────────────────────────────────────────────────────────

const getDisableReasons = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { search = '' } = req.query;
    const filter = { school: schoolId };
    if (search) filter.reason = { $regex: search.trim(), $options: 'i' };
    const data = await DisableReason.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getDisableReasons error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch disable reasons.' });
  }
};

const createDisableReason = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: 'Disable reason is required.' });

    const data = await DisableReason.create({ school: schoolId, reason: reason.trim() });
    return res.status(201).json({ success: true, message: 'Disable reason created successfully.', data });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Disable reason already exists.' });
    console.error('createDisableReason error', err);
    return res.status(500).json({ success: false, message: 'Failed to create disable reason.' });
  }
};

const updateDisableReason = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: 'Disable reason is required.' });

    const data = await DisableReason.findOneAndUpdate(
      { _id: req.params.id, school: schoolId },
      { reason: reason.trim() },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'Disable reason not found.' });
    return res.status(200).json({ success: true, message: 'Disable reason updated successfully.', data });
  } catch (err) {
    console.error('updateDisableReason error', err);
    return res.status(500).json({ success: false, message: 'Failed to update disable reason.' });
  }
};

const deleteDisableReason = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const deleted = await DisableReason.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Disable reason not found.' });
    return res.status(200).json({ success: true, message: 'Disable reason deleted successfully.' });
  } catch (err) {
    console.error('deleteDisableReason error', err);
    return res.status(500).json({ success: false, message: 'Failed to delete disable reason.' });
  }
};

// ─── SCHOOL SETTINGS ──────────────────────────────────────────────────────────

const getBulkDeleteStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const settings = await SchoolSettings.findOne({ school: schoolId });
    return res.status(200).json({ 
      success: true, 
      disabled: settings?.bulkDeleteDisabled || false 
    });
  } catch (err) {
    console.error('getBulkDeleteStatus error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bulk delete status.' });
  }
};

const getMultiClassStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const settings = await SchoolSettings.findOne({ school: schoolId });
    return res.status(200).json({ 
      success: true, 
      disabled: settings?.multiClassDisabled || false 
    });
  } catch (err) {
    console.error('getMultiClassStatus error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch multi-class status.' });
  }
};

const updateBulkDeleteStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { disabled } = req.body;
    
    const settings = await SchoolSettings.findOneAndUpdate(
      { school: schoolId },
      { bulkDeleteDisabled: disabled },
      { new: true, upsert: true }
    );
    
    return res.status(200).json({ 
      success: true, 
      message: `Bulk delete ${disabled ? 'disabled' : 'enabled'} successfully.`,
      data: settings 
    });
  } catch (err) {
    console.error('updateBulkDeleteStatus error', err);
    return res.status(500).json({ success: false, message: 'Failed to update bulk delete status.' });
  }
};

const updateMultiClassStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.user.id;
    const { disabled } = req.body;
    
    const settings = await SchoolSettings.findOneAndUpdate(
      { school: schoolId },
      { multiClassDisabled: disabled },
      { new: true, upsert: true }
    );
    
    return res.status(200).json({ 
      success: true, 
      message: `Multi-class ${disabled ? 'disabled' : 'enabled'} successfully.`,
      data: settings 
    });
  } catch (err) {
    console.error('updateMultiClassStatus error', err);
    return res.status(500).json({ success: false, message: 'Failed to update multi-class status.' });
  }
};

module.exports = {
  getCategories, createCategory, updateCategory, deleteCategory,
  getHouses, createHouse, updateHouse, deleteHouse,
  getDisableReasons, createDisableReason, updateDisableReason, deleteDisableReason,
  getBulkDeleteStatus, getMultiClassStatus, updateBulkDeleteStatus, updateMultiClassStatus,
};
