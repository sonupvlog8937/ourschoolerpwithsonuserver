const Homework = require("../model/homework.model");
const HomeworkSubmission = require("../model/homeworkSubmission.model");
const mongoose = require("mongoose");

module.exports = {
  // Create homework
  createHomework: async (req, res) => {
    try {
      const { classId, subjectId, title, description, homework_date, submission_date, attachment } = req.body;
      const schoolId = req.user.schoolId;
      const teacherId = req.user.id;

      const homework = new Homework({
        school: schoolId,
        class: classId,
        subject: subjectId,
        teacher: teacherId,
        title,
        description,
        homework_date,
        submission_date,
        attachment: attachment || "",
      });

      await homework.save();
      res.status(201).json({ success: true, message: "Homework created successfully", data: homework });
    } catch (error) {
      console.error("Error creating homework:", error);
      res.status(500).json({ success: false, message: "Error creating homework", error: error.message });
    }
  },

  // Get all homework
  getAllHomework: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { classId, subjectId, status } = req.query;

      const filter = { school: schoolId };
      if (classId) filter.class = classId;
      if (subjectId) filter.subject = subjectId;
      if (status) filter.status = status;

      const homework = await Homework.find(filter)
        .populate("class", "class_text class_num")
        .populate("subject", "subject_name")
        .populate("teacher", "name email")
        .sort({ homework_date: -1 });

      res.status(200).json({ success: true, data: homework });
    } catch (error) {
      console.error("Error fetching homework:", error);
      res.status(500).json({ success: false, message: "Error fetching homework", error: error.message });
    }
  },

  // Get homework by ID
  getHomeworkById: async (req, res) => {
    try {
      const { id } = req.params;
      const homework = await Homework.findById(id)
        .populate("class", "class_text class_num")
        .populate("subject", "subject_name")
        .populate("teacher", "name email");

      if (!homework) {
        return res.status(404).json({ success: false, message: "Homework not found" });
      }

      res.status(200).json({ success: true, data: homework });
    } catch (error) {
      console.error("Error fetching homework:", error);
      res.status(500).json({ success: false, message: "Error fetching homework", error: error.message });
    }
  },

  // Update homework
  updateHomework: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const homework = await Homework.findByIdAndUpdate(id, updates, { new: true });

      if (!homework) {
        return res.status(404).json({ success: false, message: "Homework not found" });
      }

      res.status(200).json({ success: true, message: "Homework updated successfully", data: homework });
    } catch (error) {
      console.error("Error updating homework:", error);
      res.status(500).json({ success: false, message: "Error updating homework", error: error.message });
    }
  },

  // Delete homework
  deleteHomework: async (req, res) => {
    try {
      const { id } = req.params;
      const homework = await Homework.findByIdAndDelete(id);

      if (!homework) {
        return res.status(404).json({ success: false, message: "Homework not found" });
      }

      // Delete all submissions for this homework
      await HomeworkSubmission.deleteMany({ homework: id });

      res.status(200).json({ success: true, message: "Homework deleted successfully" });
    } catch (error) {
      console.error("Error deleting homework:", error);
      res.status(500).json({ success: false, message: "Error deleting homework", error: error.message });
    }
  },

  // Submit homework (Student)
  submitHomework: async (req, res) => {
    try {
      const { homeworkId, submission_text, attachment } = req.body;
      const studentId = req.user.id;

      // Check if already submitted
      const existing = await HomeworkSubmission.findOne({ homework: homeworkId, student: studentId });
      if (existing) {
        return res.status(400).json({ success: false, message: "Homework already submitted" });
      }

      const submission = new HomeworkSubmission({
        homework: homeworkId,
        student: studentId,
        submission_text,
        attachment: attachment || "",
        status: "Submitted",
      });

      await submission.save();
      res.status(201).json({ success: true, message: "Homework submitted successfully", data: submission });
    } catch (error) {
      console.error("Error submitting homework:", error);
      res.status(500).json({ success: false, message: "Error submitting homework", error: error.message });
    }
  },

  // Get submissions for homework
  getHomeworkSubmissions: async (req, res) => {
    try {
      const { homeworkId } = req.params;

      const submissions = await HomeworkSubmission.find({ homework: homeworkId })
        .populate("student", "name roll_number email")
        .populate("evaluated_by", "name")
        .sort({ submitted_date: -1 });

      res.status(200).json({ success: true, data: submissions });
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ success: false, message: "Error fetching submissions", error: error.message });
    }
  },

  // Evaluate homework submission
  evaluateHomework: async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { marks, max_marks, remarks } = req.body;
      const teacherId = req.user.id;

      const submission = await HomeworkSubmission.findByIdAndUpdate(
        submissionId,
        {
          marks,
          max_marks,
          remarks,
          status: "Evaluated",
          evaluated_by: teacherId,
          evaluated_date: new Date(),
        },
        { new: true }
      );

      if (!submission) {
        return res.status(404).json({ success: false, message: "Submission not found" });
      }

      res.status(200).json({ success: true, message: "Homework evaluated successfully", data: submission });
    } catch (error) {
      console.error("Error evaluating homework:", error);
      res.status(500).json({ success: false, message: "Error evaluating homework", error: error.message });
    }
  },
};
