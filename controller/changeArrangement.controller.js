const ChangeArrangement = require("../model/changeArrangement.model");

// Create change arrangement
const createChangeArrangement = async (req, res) => {
  try {
    const { class: classId, sections, absentTeacher, assignTeacher, date, status } = req.body;
    const school = req.user?.schoolId || req.user?.school?._id || req.body.school;

    if (!school) {
      console.error("School not found in request:", { user: req.user, body: req.body });
      return res.status(400).json({ message: "School information is required" });
    }

    if (!classId || !absentTeacher || !assignTeacher || !date) {
      return res.status(400).json({ message: "Class, absent teacher, assign teacher, and date are required" });
    }

    const changeArrangement = new ChangeArrangement({
      school,
      class: classId,
      sections: sections || [],
      absentTeacher,
      assignTeacher,
      date,
      status: status || "Active",
    });

    await changeArrangement.save();
    
    // Populate the data before sending response
    await changeArrangement.populate([
      { path: "class", select: "class_text class_num" },
      { path: "sections", select: "name" },
      { path: "absentTeacher", select: "name" },
      { path: "assignTeacher", select: "name" }
    ]);
    
    res.status(201).json({ message: "Change arrangement created successfully", data: changeArrangement });
  } catch (error) {
    console.error("Error creating change arrangement:", error);
    res.status(500).json({ message: "Error creating change arrangement", error: error.message });
  }
};

// Get all change arrangements
const getAllChangeArrangements = async (req, res) => {
  try {
    const school = req.user?.schoolId || req.user?.school?._id || req.query.school;
    const changeArrangements = await ChangeArrangement.find({ school })
      .populate("class", "class_text class_num")
      .populate("sections", "name")
      .populate("absentTeacher", "name")
      .populate("assignTeacher", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: changeArrangements });
  } catch (error) {
    console.error("Error fetching change arrangements:", error);
    res.status(500).json({ message: "Error fetching change arrangements", error: error.message });
  }
};

// Update change arrangement
const updateChangeArrangement = async (req, res) => {
  try {
    const { id } = req.params;
    const { class: classId, sections, absentTeacher, assignTeacher, date, status } = req.body;

    const changeArrangement = await ChangeArrangement.findByIdAndUpdate(
      id,
      {
        class: classId,
        sections: sections || [],
        absentTeacher,
        assignTeacher,
        date,
        status,
      },
      { new: true }
    ).populate("class", "class_text class_num")
      .populate("sections", "name")
      .populate("absentTeacher", "name")
      .populate("assignTeacher", "name");

    if (!changeArrangement) {
      return res.status(404).json({ message: "Change arrangement not found" });
    }

    res.status(200).json({ message: "Change arrangement updated successfully", data: changeArrangement });
  } catch (error) {
    console.error("Error updating change arrangement:", error);
    res.status(500).json({ message: "Error updating change arrangement", error: error.message });
  }
};

// Delete change arrangement
const deleteChangeArrangement = async (req, res) => {
  try {
    const { id } = req.params;

    const changeArrangement = await ChangeArrangement.findByIdAndDelete(id);

    if (!changeArrangement) {
      return res.status(404).json({ message: "Change arrangement not found" });
    }

    res.status(200).json({ message: "Change arrangement deleted successfully" });
  } catch (error) {
    console.error("Error deleting change arrangement:", error);
    res.status(500).json({ message: "Error deleting change arrangement", error: error.message });
  }
};

module.exports = {
  createChangeArrangement,
  getAllChangeArrangements,
  updateChangeArrangement,
  deleteChangeArrangement,
};