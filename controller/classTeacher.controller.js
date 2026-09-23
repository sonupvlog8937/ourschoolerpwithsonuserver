require("dotenv").config();

const ClassTeacher = require("../model/classTeacher.model");
const Class = require("../model/class.model");
const Teacher = require("../model/role/teacher.model");
const Section = require("../model/section.model");

module.exports = {
    getAllClassTeacher: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;
            const allClassTeacher = await ClassTeacher.find({ school: schoolId })
                .populate('class')
                .populate('sections')
                .populate('teacher')
                .sort({ createdAt: -1 });
            console.log("Fetched class teachers:", allClassTeacher);
            res.status(200).json({ success: true, message: "Success in fetching all Class Teacher assignments", data: allClassTeacher });
        } catch (error) {
            console.log("Error in getAllClassTeacher", error);
            res.status(500).json({ success: false, message: "Server Error in Getting All Class Teacher. Try later" });
        }
    },

    createClassTeacher: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;
            const newClassTeacher = new ClassTeacher({ ...req.body, school: schoolId });
            const savedData = await newClassTeacher.save();
            console.log("Data saved", savedData);
            res.status(200).json({ success: true, data: savedData, message: "Class Teacher Assignment Created Successfully." });
        } catch (error) {
            console.log("ERROR in createClassTeacher", error);
            res.status(500).json({ success: false, message: "Failed Creation of Class Teacher Assignment." });
        }
    },

    getClassTeacherWithId: async (req, res) => {
        try {
            const id = req.params.id;
            const classTeacher = await ClassTeacher.findById(id)
                .populate('class')
                .populate('sections')
                .populate('teacher');
            if (classTeacher) {
                res.status(200).json({ success: true, data: classTeacher });
            } else {
                res.status(404).json({ success: false, message: "Class Teacher data not Available" });
            }
        } catch (error) {
            console.log("Error in getClassTeacherWithId", error);
            res.status(500).json({ success: false, message: "Error in getting Class Teacher Data" });
        }
    },

    updateClassTeacherWithId: async (req, res) => {
        try {
            const id = req.params.id;
            const schoolId = req.user.schoolId;
            await ClassTeacher.findOneAndUpdate({ _id: id, school: schoolId }, { $set: { ...req.body } });
            const classTeacherAfterUpdate = await ClassTeacher.findOne({ _id: id, school: schoolId })
                .populate('class')
                .populate('sections')
                .populate('teacher');
            res.status(200).json({ success: true, message: "Class Teacher Assignment Updated", data: classTeacherAfterUpdate });
        } catch (error) {
            console.log("Error in updateClassTeacherWithId", error);
            res.status(500).json({ success: false, message: "Server Error in Update Class Teacher. Try later" });
        }
    },

    deleteClassTeacherWithId: async (req, res) => {
        try {
            const id = req.params.id;
            const schoolId = req.user.schoolId;
            await ClassTeacher.findOneAndDelete({ _id: id, school: schoolId });
            const classTeacherAfterDelete = await ClassTeacher.findOne({ _id: id });
            res.status(200).json({ success: true, message: "Class Teacher Assignment Deleted.", data: classTeacherAfterDelete });
        } catch (error) {
            console.log("Error in deleteClassTeacherWithId", error);
            res.status(500).json({ success: false, message: "Server Error in Deleting Class Teacher. Try later" });
        }
    },

    getClasses: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;
            const allClasses = await Class.find({ school: schoolId }).sort({ class_num: 1 });
            res.status(200).json({ success: true, data: allClasses });
        } catch (error) {
            console.log("Error in getClasses", error);
            res.status(500).json({ success: false, message: "Server Error in Getting Classes. Try later" });
        }
    },

    getTeachers: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;
            const allTeachers = await Teacher.find({ school: schoolId });
            res.status(200).json({ success: true, data: allTeachers });
        } catch (error) {
            console.log("Error in getTeachers", error);
            res.status(500).json({ success: false, message: "Server Error in Getting Teachers. Try later" });
        }
    },

    getSections: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;
            const classId = req.query.classId;
            // Fetch all sections for the school (sections are not class-specific in this model)
            const allSections = await Section.find({ school: schoolId }).sort({ position: 1, name: 1 });
            res.status(200).json({ success: true, data: allSections });
        } catch (error) {
            console.log("Error in getSections", error);
            res.status(500).json({ success: false, message: "Server Error in Getting Sections. Try later" });
        }
    }
};