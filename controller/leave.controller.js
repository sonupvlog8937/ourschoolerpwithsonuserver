const Leave = require("../model/leave.model");
const mongoose = require("mongoose");

module.exports = {
  // Apply for leave
  applyLeave: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const applicantId = req.user.id;
      const applicantType = req.user.role === "TEACHER" ? "Teacher" : "Student";

      const { leave_type, from_date, to_date, reason, attachment } = req.body;

      // Calculate days
      const fromDate = new Date(from_date);
      const toDate = new Date(to_date);
      const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

      const leave = new Leave({
        school: schoolId,
        applicant_type: applicantType,
        applicant: applicantId,
        leave_type,
        from_date: fromDate,
        to_date: toDate,
        days,
        reason,
        attachment: attachment || "",
      });

      await leave.save();

      res.status(201).json({ success: true, message: "Leave application submitted successfully", data: leave });
    } catch (error) {
      console.error("Error applying leave:", error);
      res.status(500).json({ success: false, message: "Error applying leave", error: error.message });
    }
  },

  // Get all leaves
  getAllLeaves: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status, applicant_type, leave_type } = req.query;

      const filter = { school: schoolId };
      if (status) filter.status = status;
      if (applicant_type) filter.applicant_type = applicant_type;
      if (leave_type) filter.leave_type = leave_type;

      const leaves = await Leave.find(filter)
        .populate("applicant", "name email roll_number")
        .populate("approved_by", "name")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: leaves });
    } catch (error) {
      console.error("Error fetching leaves:", error);
      res.status(500).json({ success: false, message: "Error fetching leaves", error: error.message });
    }
  },

  // Get leave by ID
  getLeaveById: async (req, res) => {
    try {
      const { id } = req.params;
      const leave = await Leave.findById(id)
        .populate("applicant", "name email roll_number")
        .populate("approved_by", "name");

      if (!leave) {
        return res.status(404).json({ success: false, message: "Leave not found" });
      }

      res.status(200).json({ success: true, data: leave });
    } catch (error) {
      console.error("Error fetching leave:", error);
      res.status(500).json({ success: false, message: "Error fetching leave", error: error.message });
    }
  },

  // Get my leaves
  getMyLeaves: async (req, res) => {
    try {
      const applicantId = req.user.id;

      const leaves = await Leave.find({ applicant: applicantId })
        .populate("approved_by", "name")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: leaves });
    } catch (error) {
      console.error("Error fetching leaves:", error);
      res.status(500).json({ success: false, message: "Error fetching leaves", error: error.message });
    }
  },

  // Approve/Reject leave
  updateLeaveStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const approvedBy = req.user.id;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const leave = await Leave.findByIdAndUpdate(
        id,
        {
          status,
          remarks: remarks || "",
          approved_by: approvedBy,
          approval_date: new Date(),
        },
        { new: true }
      );

      if (!leave) {
        return res.status(404).json({ success: false, message: "Leave not found" });
      }

      res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, data: leave });
    } catch (error) {
      console.error("Error updating leave status:", error);
      res.status(500).json({ success: false, message: "Error updating leave status", error: error.message });
    }
  },

  // Delete leave
  deleteLeave: async (req, res) => {
    try {
      const { id } = req.params;
      const leave = await Leave.findByIdAndDelete(id);

      if (!leave) {
        return res.status(404).json({ success: false, message: "Leave not found" });
      }

      res.status(200).json({ success: true, message: "Leave deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave:", error);
      res.status(500).json({ success: false, message: "Error deleting leave", error: error.message });
    }
  },

  // Get leave summary
  getLeaveSummary: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { applicant_type } = req.query;

      const filter = { school: schoolId };
      if (applicant_type) filter.applicant_type = applicant_type;

      const leaves = await Leave.find(filter);

      const summary = {
        total: leaves.length,
        pending: leaves.filter((l) => l.status === "Pending").length,
        approved: leaves.filter((l) => l.status === "Approved").length,
        rejected: leaves.filter((l) => l.status === "Rejected").length,
        total_days: leaves.reduce((sum, l) => sum + l.days, 0),
      };

      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      console.error("Error fetching leave summary:", error);
      res.status(500).json({ success: false, message: "Error fetching leave summary", error: error.message });
    }
  },
};
