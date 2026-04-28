require("dotenv").config();
const formidable = require("formidable");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const { uploadStudentImage, deleteStudentImage } = require("../../utils/cloudinaryUpload");

const jwtSecret = process.env.JWTSECRET;

const Student = require("../../model/role/student.model");
const Attendance = require('../../model/attendance.model');
const { buildStudentsSortedByRollPipeline } = require("../../utils/studentRollSort");

module.exports = {

   
    getStudentWithQuery: async(req, res)=>{
      
        try {
            const filterQuery = {};
            const schoolId = req.user.schoolId;
            console.log(schoolId,"schoolId")
            filterQuery['school'] = schoolId;
            if(req.query.hasOwnProperty('search')){
                filterQuery['name'] = {$regex: req.query.search, $options:'i'}
            }
            
            if(req.query.hasOwnProperty('student_class')){
                filterQuery['student_class'] = req.query.student_class
            }
    
            const hasPagination = req.query.page || req.query.limit;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;
            const sortByRoll = String(req.query.sortBy || "").toLowerCase() === "roll";

            const [filteredStudents, total] = await Promise.all([
                sortByRoll
                    ? Student.aggregate(
                        buildStudentsSortedByRollPipeline(
                            filterQuery,
                            skip,
                            limit,
                            Boolean(hasPagination)
                        )
                    )
                    : Student.find(filterQuery)
                        .populate("student_class")
                        .sort({ createdAt: -1 })
                        .skip(hasPagination ? skip : 0)
                        .limit(hasPagination ? limit : 0),
                Student.countDocuments(filterQuery)
            ]);

            res.status(200).json({
                success:true,
                data:filteredStudents,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit) || 1
                }
            })
        } catch (error) {
            console.log("Error in fetching Student with query", error);
            res.status(500).json({success:false, message:"Error  in fetching Student  with query."})
        }

    },


    registerStudent: async (req, res) => {
        const form = new formidable.IncomingForm();

        form.parse(req, (err, fields, files) => {
            const name = String(fields.name?.[0] ?? "").trim();
            const roll = fields.roll_number?.[0];
            const email = fields.email?.[0];
            const studentClass = fields.student_class?.[0];
            const plainPassword = fields.password?.[0];

            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }
            if (!roll) {
                return res.status(400).json({ success: false, message: "Roll number is required." });
            }
            if (!email) {
                return res.status(400).json({ success: false, message: "Email is required." });
            }
            if (!studentClass) {
                return res.status(400).json({ success: false, message: "Class is required." });
            }
            if (!plainPassword) {
                return res.status(400).json({ success: false, message: "Password is required." });
            }

            const address = String(fields.address?.[0] ?? "").trim();
            const aadharDigits = String(fields.aadhar_number?.[0] ?? "").replace(/\D/g, "");
            if (aadharDigits.length > 0 && aadharDigits.length !== 12) {
                return res.status(400).json({ success: false, message: "Aadhar must be 12 digits or left empty." });
            }

            Student.find({ email }).then((resp) => {
                if (resp.length > 0) {
                    res.status(500).json({ success: false, message: "Email Already Exist!" });
                    return;
                }

                const salt = bcrypt.genSaltSync(10);
                const hashPassword = bcrypt.hashSync(plainPassword, salt);

                const buildPayload = (imageUrl, publicId) => ({
                    email,
                    name,
                    roll_number: roll,
                    address,
                    aadhar_number: aadharDigits.length === 12 ? aadharDigits : "",
                    student_class: studentClass,
                    guardian: fields.guardian?.[0] ?? "",
                    guardian_phone: fields.guardian_phone?.[0] ?? "",
                    age: fields.age?.[0] != null && fields.age[0] !== "" ? String(fields.age[0]) : "",
                    gender: fields.gender?.[0] ?? "",
                    student_image: imageUrl || "",
                    student_image_public_id: publicId || undefined,
                    password: hashPassword,
                    school: req.user.id,
                });

                const saveStudent = (imageUrl, publicId) => {
                    const newStudent = new Student(buildPayload(imageUrl, publicId));
                    newStudent
                        .save()
                        .then((savedData) => {
                            res.status(200).json({
                                success: true,
                                data: savedData,
                                message: "Student is Registered Successfully.",
                            });
                        })
                        .catch((e) => {
                            console.log("ERRORO in Register", e);
                            res.status(500).json({ success: false, message: "Failed Registration." });
                        });
                };

                const photo = files.image?.[0];
                if (photo) {
                    uploadStudentImage(photo.filepath, photo.mimetype)
                        .then((uploadResult) => {
                            saveStudent(uploadResult.secure_url, uploadResult.public_id);
                        })
                        .catch((uploadError) => {
                            console.log("Cloudinary upload error", uploadError);
                            res.status(500).json({ success: false, message: "Failed to upload student image." });
                        });
                } else {
                    saveStudent("", undefined);
                }
            });
        })



    },
    loginStudent: async (req, res) => {
        const { email, password } = req.body;
        
        // Support login via email OR username
        let query;
        if (email && email.includes('@')) {
            // Direct email login
            query = { email };
        } else {
            // Username login - check both @edusmart.com and @school.com formats
            query = { 
                $or: [
                    { email: `${email}@school.com` },
                ]
            };
        }
        
        Student.findOne(query).then(resp => {
            console.log('Login attempt - email/username:', email, '| Query:', JSON.stringify(query), '| Found:', resp ? resp.email : 'NOT FOUND');
            if (resp) {
                const isAuth = bcrypt.compareSync(password, resp.password);
                if (isAuth) {   
                    const token = jwt.sign(
                        {
                            id: resp._id,
                            schoolId: resp.school,
                            email: resp.email,
                            image_url: resp.image_url,
                            name: resp.name,
                            role: 'STUDENT'
                        }, jwtSecret);

                    res.header("Authorization", token);
                    res.status(200).json({ success: true, message: "Success Login", user: {
                        id: resp._id,
                        email: resp.email,
                        image_url: resp.student_image,
                        name: resp.name,
                        role: 'STUDENT'
                    }});
                } else {
                    res.status(401).json({ success: false, message: "Password doesn't match." });
                }
            } else {
                res.status(401).json({ success: false, message: "Username or Email not registered." });
            }
        }).catch(err => {
            console.error('loginStudent error:', err);
            res.status(500).json({ success: false, message: "Server error during login." });
        });
    },
    getStudentWithId: async(req, res)=>{
        const id = req.params.id;
        const schoolId =  req.user.schoolId;
        Student.findOne({_id:id, school:schoolId}).populate("student_class").then(resp=>{
            if(resp){
                console.log("data",resp)
                res.status(200).json({success:true, data:resp})
            }else {
                res.status(500).json({ success: false, message: "Student data not Available" })
            }
        }).catch(e=>{
            console.log("Error in getStudentWithId", e)
            res.status(500).json({ success: false, message: "Error in getting  Student Data" })
        })
    },
     getOwnDetails: async(req, res)=>{
        const id = req.user.id;
        const schoolId =  req.user.schoolId;
        Student.findOne({_id:id,school:schoolId}).populate("student_class").then(resp=>{
            if(resp){
                console.log("data",resp)
                res.status(200).json({success:true, data:resp})
            }else {
                res.status(500).json({ success: false, message: "Student data not Available" })
            }
        }).catch(e=>{
            console.log("Error in getStudentWithId", e)
            res.status(500).json({ success: false, message: "Error in getting  Student Data" })
        })
    },
    // updateStudentWithId: async(req, res)=>{
       
    //     try {
    //         let id = req.params.id;
    //         const schoolId =  req.user.schoolId;
    //         console.log(req.body)
    //         await Student.findOneAndUpdate({_id:id,school:schoolId},{$set:{...req.body}});
    //         const StudentAfterUpdate =await Student.findOne({_id:id});
    //         res.status(200).json({success:true, message:"Student Updated", data:StudentAfterUpdate})
    //     } catch (error) {
            
    //         console.log("Error in updateStudentWithId", error);
    //         res.status(500).json({success:false, message:"Server Error in Update Student. Try later"})
    //     }

    // },
updateStudentWithId : async (req, res) => {
    const form =new formidable.IncomingForm({ multiples: false, keepExtensions: true });
  
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ message: "Error parsing the form data." });
      }
      try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const student = await Student.findOne({ _id: id, school: schoolId });
  
        if (!student) {
          return res.status(404).json({ message: "Student not found." });
        }

        const name = String(fields.name?.[0] ?? "").trim();
        const email = String(fields.email?.[0] ?? "").trim();
        const roll = fields.roll_number?.[0];
        const cls = fields.student_class?.[0];
        const rawPassword = fields.password?.[0];

        if (!name) return res.status(400).json({ message: "Name is required." });
        if (!email) return res.status(400).json({ message: "Email is required." });
        if (!roll) return res.status(400).json({ message: "Roll number is required." });
        if (!cls) return res.status(400).json({ message: "Class is required." });
        if (rawPassword == null || String(rawPassword).length === 0) {
          return res.status(400).json({ message: "Password is required." });
        }
  
        Object.keys(fields).forEach((field) => {
          if (field === "password") return;
          student[field] = fields[field][0];
        });

        const pwdStr = String(rawPassword);
        if (/^\$2[aby]\$/.test(pwdStr)) {
          student.password = pwdStr;
        } else {
          student.password = bcrypt.hashSync(pwdStr, bcrypt.genSaltSync(10));
        }

        if (fields.aadhar_number) {
          const aadharDigits = String(fields.aadhar_number[0] ?? "").replace(/\D/g, "");
          if (aadharDigits.length > 0 && aadharDigits.length !== 12) {
            return res.status(400).json({ message: "Aadhar must be 12 digits or left empty." });
          }
          student.aadhar_number = aadharDigits.length === 12 ? aadharDigits : "";
        }
  
        // Handle image file if provided
        if (files.image) {
          // Delete the old image if it exists
          
        
          let filepath = files.image[0].filepath;
          const uploadResult = await uploadStudentImage(filepath, files.image[0].mimetype);

          if (student.student_image_public_id) {
            try {
              await deleteStudentImage(student.student_image_public_id);
            } catch (destroyError) {
              console.log("Error deleting old image from cloudinary:", destroyError);
            }
          }


          student.student_image = uploadResult.secure_url;
          student.student_image_public_id = uploadResult.public_id;
        }
  
        // Save the updated student document
        await student.save();
        res.status(200).json({ message: "Student updated successfully", data: student });
      } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error updating student details." });
      }
    });
  },
    deleteStudentWithId: async(req, res)=>{
        try {
            let id = req.params.id;
            const schoolId =  req.user.schoolId;
            await Attendance.deleteMany({school:schoolId,student:id})
            await Student.findOneAndDelete({_id:id, school:schoolId,});
            const studentAfterDelete =await Student.findOne({_id:id});
            res.status(200).json({success:true, message:"Student  deleted", data:studentAfterDelete})
        } catch (error) {
            console.log("Error in updateStudentWithId", error);
            res.status(500).json({success:false, message:"Server Error in deleted Student. Try later"})
        }

    },
    signOut:async(req, res)=>{
       

        try {
            res.header("Authorization",  "");
            res.status(200).json({success:true, message:"Student Signed Out  Successfully."})
        } catch (error) {
            console.log("Error in Sign out", error);
            res.status(500).json({success:false, message:"Server Error in Signing Out. Try later"})
        }
    },
    isStudentLoggedIn: async(req,  res)=>{
        try {
            let token = req.header("Authorization");
            if(token){
                var decoded = jwt.verify(token, jwtSecret);
                console.log(decoded)
                if(decoded){
                    res.status(200).json({success:true,  data:decoded, message:"Student is a logged in One"})
                }else{
                    res.status(401).json({success:false, message:"You are not Authorized."})
                }
            }else{
                res.status(401).json({success:false, message:"You are not Authorized."})
            }
        } catch (error) {
            console.log("Error in isStudentLoggedIn", error);
            res.status(500).json({success:false, message:"Server Error in Student Logged in check. Try later"})
        }
    }
   
}