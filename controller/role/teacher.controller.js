require("dotenv").config();
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/cloudinaryUpload");

const jwtSecret = process.env.JWTSECRET;

const Teacher = require("../../model/role/teacher.model");
const School = require("../../model/role/school.model");

module.exports = {

    getTeacherWithQuery: async(req, res)=>{
        try {
            const filterQuery = {};
            const schoolId = req.user.schoolId;
            filterQuery['school'] = schoolId;
            if(req.query.hasOwnProperty('search')){
                filterQuery['name'] = {$regex: req.query.search, $options:'i'}
            }
            
          
    
            const filteredTeachers = await Teacher.find(filterQuery);
            res.status(200).json({success:true, data:filteredTeachers})
        } catch (error) {
            console.log("Error in fetching Teacher with query", error);
            res.status(500).json({success:false, message:"Error  in fetching Teacher  with query."})
        }

    },


    registerTeacher: async (req, res) => {
        const form = new formidable.IncomingForm();
        const schoolId = req.user.schoolId;
        
        form.parse(req, async (err, fields, files) => {
            try {
                const existingTeacher = await Teacher.find({ email: fields.email[0] });
                if (existingTeacher.length > 0) {
                    return res.status(500).json({ success: false, message: "Email Already Exist!" });
                }

                const photo = files.image[0];
                let oldPath = photo.filepath;

                // Upload to Cloudinary
                const imageUrl = await uploadToCloudinary(oldPath, "teacher");

                var salt = bcrypt.genSaltSync(10);
                var hashPassword = bcrypt.hashSync(fields.password[0], salt);

                const newTeacher = new Teacher({
                    email: fields.email[0],
                    name: fields.name[0],
                    qualification: fields.qualification[0],
                    age: fields.age[0],
                    gender: fields.gender[0],
                    teacher_image: imageUrl,
                    password: hashPassword,
                    school: schoolId
                });

                const savedData = await newTeacher.save();
                console.log("Data saved", savedData);
                res.status(200).json({ success: true, data: savedData, message: "Teacher is Registered Successfully." });
            } catch (e) {
                console.log("ERROR in Register", e);
                res.status(500).json({ success: false, message: "Failed Registration." });
            }
        });
    },
    loginTeacher: async (req, res) => {
        try {
            const resp = await Teacher.find({ email: req.body.email });
            if (resp.length === 0) {
                return res.status(401).json({ success: false, message: "Email not registerd." });
            }
            const isAuth = bcrypt.compareSync(req.body.password, resp[0].password);
            if (!isAuth) {
                return res.status(401).json({ success: false, message: "Password doesn't match." });
            }

            const schoolDoc = await School.findById(resp[0].school).select("school_name").lean();
            const schoolName = schoolDoc?.school_name || "";

            const token = jwt.sign(
                {
                    id: resp[0]._id,
                    schoolId: resp[0].school,
                    name: resp[0].name,
                    school_name: schoolName,
                    image_url: resp[0].teacher_image,
                    role: "TEACHER",
                },
                jwtSecret
            );

            res.header("Authorization", token);
            return res.status(200).json({
                success: true,
                message: "Success Login",
                user: {
                    id: resp[0]._id,
                    username: resp[0].username,
                    school_name: schoolName,
                    image_url: resp[0].teacher_image,
                    role: "TEACHER",
                },
            });
        } catch (err) {
            console.log("loginTeacher error", err);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    },
    getTeacherOwnDetails: async(req, res)=>{
        try {
            const id = req.user.id;
            const resp = await Teacher.findOne({ _id: id, school: req.user.schoolId }).populate(
                "school",
                "school_name school_image owner_name"
            );
            if (resp) {
                res.status(200).json({ success: true, data: resp });
            } else {
                res.status(500).json({ success: false, message: "Teacher data not Available" });
            }
        } catch (e) {
            console.log("Error in getTeacherOwnDetails", e);
            res.status(500).json({ success: false, message: "Error in getting  Teacher Data" });
        }
    },
    getTeacherWithId: async(req, res)=>{
        const id = req.params.id;
        Teacher.findById(id).then(resp=>{
            if(resp){
                res.status(200).json({success:true, data:resp})
            }else {
                res.status(500).json({ success: false, message: "Teacher data not Available" })
            }
        }).catch(e=>{
            console.log("Error in getTeacherWithId", e)
            res.status(500).json({ success: false, message: "Error in getting  Teacher Data" })
        })
    },

    updateTeacherWithId: async (req, res) => {
        const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(400).json({ message: "Error parsing the form data." });
            }
            
            try {
                const { id } = req.params;
                const teacher = await Teacher.findById(id);

                if (!teacher) {
                    return res.status(404).json({ message: "teacher not found." });
                }

                // Update text fields
                Object.keys(fields).forEach((field) => {
                    teacher[field] = fields[field][0];
                });

                // Handle image file if provided
                if (files.image) {
                    // Delete old image from Cloudinary
                    if (teacher.teacher_image) {
                        await deleteFromCloudinary(teacher.teacher_image);
                    }

                    // Upload new image to Cloudinary
                    let filepath = files.image[0].filepath;
                    const imageUrl = await uploadToCloudinary(filepath, "teacher");
                    teacher.teacher_image = imageUrl;
                }

                // Save the updated teacher document
                await teacher.save();
                res.status(200).json({ message: "teacher updated successfully", data: teacher });
            } catch (e) {
                console.log(e);
                res.status(500).json({ message: "Error updating teacher details." });
            }
        });
    },
    deleteTeacherWithId: async(req, res)=>{
        try {
            let id = req.params.id;
            // console.log(req.body)
            await Teacher.findOneAndDelete({_id:id});
            const TeacherAfterDelete =await Teacher.findOne({_id:id});
            res.status(200).json({success:true, message:"Teacher  deleted", data:TeacherAfterDelete})
        } catch (error) {
            console.log("Error in updateTeacherWithId", error);
            res.status(500).json({success:false, message:"Server Error in deleted Teacher. Try later"})
        }

    },
    signOut:async(req, res)=>{
       

        try {
            res.header("Authorization",  "");
            res.status(200).json({success:true, message:"Teacher Signed Out  Successfully."})
        } catch (error) {
            console.log("Error in Sign out", error);
            res.status(500).json({success:false, message:"Server Error in Signing Out. Try later"})
        }
    },
    isTeacherLoggedIn: async(req,  res)=>{
        try {
            let token = req.header("Authorization");
            if(token){
                var decoded = jwt.verify(token, jwtSecret);
                console.log(decoded)
                if(decoded){
                    res.status(200).json({success:true,  data:decoded, message:"Teacher is a logged in One"})
                }else{
                    res.status(401).json({success:false, message:"You are not Authorized."})
                }
            }else{
                res.status(401).json({success:false, message:"You are not Authorized."})
            }
        } catch (error) {
            console.log("Error in isTeacherLoggedIn", error);
            res.status(500).json({success:false, message:"Server Error in Teacher Logged in check. Try later"})
        }
    }
   
}
