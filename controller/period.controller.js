const Period = require('../model/period.model');

// Controller to create a timing period
exports.createPeriod = async (req, res) => {
  try {
    const { period, startTime, endTime, status } = req.body;
    const schoolId = req.user.schoolId;
    const newPeriod = new Period({
      period,
      startTime,
      endTime,
      status: status || 'Active',
      school: schoolId
    });

    await newPeriod.save();
    res.status(201).json({ success: true, message: 'Timing created successfully', data: newPeriod });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating timing', error });
    console.log("Error", error);
  }
};

// Get all timing periods for the school
exports.getPeriods = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const periods = await Period.find({ school: schoolId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: periods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching timings', error });
  }
};

// Get single timing period by ID
exports.getPeriodsWithId = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await Period.findById(id);
    res.status(200).json({ success: true, data: period });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching timing by id', error });
  }
};

// Update timing period
exports.updatePeriod = async (req, res) => {
  try {
    const { period, startTime, endTime, status } = req.body;
    const periodId = req.params.id;
    const schoolId = req.user.schoolId;
    
    const updatedPeriod = await Period.findOneAndUpdate(
      { _id: periodId, school: schoolId },
      { period, startTime, endTime, status },
      { new: true }
    );
    
    if (!updatedPeriod) {
      return res.status(404).json({ success: false, message: 'Timing not found' });
    }
    
    res.status(200).json({ success: true, message: 'Timing updated successfully', data: updatedPeriod });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating timing', error });
  }
};

// Delete timing period
exports.deletePeriod = async (req, res) => {
  try {
    const periodId = req.params.id;
    const schoolId = req.user.schoolId;
    
    const deletedPeriod = await Period.findOneAndDelete({ _id: periodId, school: schoolId });
    
    if (!deletedPeriod) {
      return res.status(404).json({ success: false, message: 'Timing not found' });
    }
    
    res.status(200).json({ success: true, message: 'Timing deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting timing', error });
  }
};