const mongoose = require("mongoose");

const classTeacherSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.ObjectId, ref: 'School', required: true },
    class: { type: mongoose.Schema.ObjectId, ref: 'Class', required: true },
    sections: [{ type: mongoose.Schema.ObjectId, ref: 'Section' }],
    teacher: { type: mongoose.Schema.ObjectId, ref: 'Teacher', required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ClassTeacher", classTeacherSchema);