const StudyMaterial = require("../model/studyMaterial.model");
const mongoose = require("mongoose");

module.exports = {
  // Upload study material
  uploadMaterial: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const teacherId = req.user.id;

      const materialData = { ...req.body, school: schoolId, teacher: teacherId };

      const material = new StudyMaterial(materialData);
      await material.save();

      res.status(201).json({ success: true, message: "Study material uploaded successfully", data: material });
    } catch (error) {
      console.error("Error uploading material:", error);
      res.status(500).json({ success: false, message: "Error uploading material", error: error.message });
    }
  },

  // Get all study materials
  getAllMaterials: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { classId, subjectId, content_type, status } = req.query;

      const filter = { school: schoolId };
      if (classId) filter.class = classId;
      if (subjectId) filter.subject = subjectId;
      if (content_type) filter.content_type = content_type;
      if (status) filter.status = status;

      const materials = await StudyMaterial.find(filter)
        .populate("class", "class_text class_num")
        .populate("subject", "subject_name")
        .populate("teacher", "name email")
        .sort({ upload_date: -1 });

      res.status(200).json({ success: true, data: materials });
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ success: false, message: "Error fetching materials", error: error.message });
    }
  },

  // Get material by ID
  getMaterialById: async (req, res) => {
    try {
      const { id } = req.params;
      const material = await StudyMaterial.findById(id)
        .populate("class", "class_text class_num")
        .populate("subject", "subject_name")
        .populate("teacher", "name email");

      if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      res.status(200).json({ success: true, data: material });
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ success: false, message: "Error fetching material", error: error.message });
    }
  },

  // Update material
  updateMaterial: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const material = await StudyMaterial.findByIdAndUpdate(id, updates, { new: true });

      if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      res.status(200).json({ success: true, message: "Material updated successfully", data: material });
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(500).json({ success: false, message: "Error updating material", error: error.message });
    }
  },

  // Delete material
  deleteMaterial: async (req, res) => {
    try {
      const { id } = req.params;
      const material = await StudyMaterial.findByIdAndDelete(id);

      if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      res.status(200).json({ success: true, message: "Material deleted successfully" });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ success: false, message: "Error deleting material", error: error.message });
    }
  },

  // Increment download count
  incrementDownload: async (req, res) => {
    try {
      const { id } = req.params;

      const material = await StudyMaterial.findByIdAndUpdate(id, { $inc: { downloads: 1 } }, { new: true });

      if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      res.status(200).json({ success: true, message: "Download recorded", data: material });
    } catch (error) {
      console.error("Error recording download:", error);
      res.status(500).json({ success: false, message: "Error recording download", error: error.message });
    }
  },
};
