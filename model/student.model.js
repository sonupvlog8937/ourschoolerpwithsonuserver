const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School" },
  roll_number: { type: String, default: "" },
  address: { type: String, default: "" },
  aadhar_number: { type: String, default: "" },
  email: { type: String, required: true },
  name: { type: String, required: true },
  student_class: { type: mongoose.Schema.ObjectId, ref: "Class" },
  age: { type: String, default: "" },
  gender: { type: String, default: "" },
  guardian: { type: String, default: "" },
  guardian_phone: { type: String, default: "" },
  student_image: { type: String, default: "" },
  student_image_public_id: { type: String },
  createdAt: { type: Date, default: new Date() },

  password: { type: String, required: true },
});

module.exports = mongoose.model("Student", studentSchema);
