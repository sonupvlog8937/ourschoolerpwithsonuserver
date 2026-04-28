require("dotenv").config();
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/cloudinaryUpload");

const jwtSecret = process.env.JWTSECRET;

const School = require("../../model/role/school.model");

module.exports = {

    // ─── PUBLIC ROUTES (No Auth Required) ────────────────────────────────────────

    // Get Top 10 Schools (for homepage)
    getTopSchools: async(req,res)=>{
        try {
           const schools = await School.find()
             .select('school_name owner_name school_image createdAt')
             .sort({ createdAt: -1 })
             .limit(10)
             .lean();
           res.status(200).json({success:true, message:"Success in fetching top schools", data:schools})
        } catch (error) {
           console.log("Error in getTopSchools", error);
           res.status(500).json({success:false, message:"Server Error in Getting Top Schools. Try later"})
       }
    },

    // Get All Schools with Pagination (for "View All" page)
    getAllSchoolsPublic: async(req,res)=>{
        try {
           const page = Math.max(parseInt(req.query.page || '1', 10), 1);
           const limit = Math.max(parseInt(req.query.limit || '12', 10), 1);
           const skip = (page - 1) * limit;
           const search = req.query.search || '';

           const filter = {};
           if (search) {
             filter.$or = [
               { school_name: { $regex: search.trim(), $options: 'i' } },
               { owner_name: { $regex: search.trim(), $options: 'i' } },
             ];
           }

           const [schools, total] = await Promise.all([
             School.find(filter)
               .select('school_name owner_name school_image createdAt')
               .sort({ createdAt: -1 })
               .skip(skip)
               .limit(limit)
               .lean(),
             School.countDocuments(filter),
           ]);

           res.status(200).json({
             success:true, 
             message:"Success in fetching all schools", 
             data:schools,
             pagination: {
               total,
               page,
               limit,
               pages: Math.ceil(total / limit) || 1,
             },
           })
        } catch (error) {
           console.log("Error in getAllSchoolsPublic", error);
           res.status(500).json({success:false, message:"Server Error in Getting All Schools. Try later"})
       }
    },

    // Get Single School Details (for school details page)
    getSchoolDetailsPublic: async(req,res)=>{
        try {
           const school = await School.findById(req.params.id)
             .select('school_name owner_name school_image email address createdAt')
             .lean();
           
           if (!school) {
             return res.status(404).json({success:false, message:"School not found"});
           }

           res.status(200).json({success:true, message:"Success in fetching school details", data:school})
        } catch (error) {
           console.log("Error in getSchoolDetailsPublic", error);
           res.status(500).json({success:false, message:"Server Error in Getting School Details. Try later"})
       }
    },

    // Submit Online Admission Application (Public - No Auth)
    submitOnlineAdmission: async(req,res)=>{
        try {
           const OnlineAdmission = require('../../model/studentInformation/onlineAdmission.model');
           const { schoolId, ...applicationData } = req.body;

           console.log('Received application data:', { schoolId, ...applicationData });

           if (!schoolId) {
             return res.status(400).json({success:false, message:"School ID is required"});
           }

           // Validate required fields
           if (!applicationData.firstName || !applicationData.lastName || 
               !applicationData.dateOfBirth || !applicationData.gender || 
               !applicationData.classApplied || !applicationData.guardianPhone) {
             return res.status(400).json({
               success:false, 
               message:"Please fill all required fields (First Name, Last Name, Date of Birth, Gender, Class Applied, Guardian Phone)"
             });
           }

           // Validate guardian phone number
           if (applicationData.guardianPhone.length !== 10) {
             return res.status(400).json({
               success:false, 
               message:"Guardian phone number must be 10 digits"
             });
           }

           // Validate mobile number if provided
           if (applicationData.mobileNumber && applicationData.mobileNumber.length !== 10) {
             return res.status(400).json({
               success:false, 
               message:"Mobile number must be 10 digits"
             });
           }

           const school = await School.findById(schoolId);
           if (!school) {
             return res.status(404).json({success:false, message:"School not found"});
           }

           // Create application with retry logic for duplicate key errors
           let application;
           let retries = 0;
           const maxRetries = 3;

           while (retries < maxRetries) {
             try {
               application = await OnlineAdmission.create({
                 school: schoolId,
                 ...applicationData,
               });
               break; // Success, exit loop
             } catch (createError) {
               if (createError.code === 11000 && retries < maxRetries - 1) {
                 // Duplicate key error, retry
                 console.log(`Duplicate key error, retrying... (${retries + 1}/${maxRetries})`);
                 retries++;
                 // Wait a bit before retry
                 await new Promise(resolve => setTimeout(resolve, 100));
               } else {
                 throw createError; // Re-throw if not duplicate or max retries reached
               }
             }
           }

           if (!application) {
             throw new Error('Failed to create application after retries');
           }

           console.log('Application created successfully:', application._id);

           res.status(201).json({
             success:true, 
             message:"Application submitted successfully. You will be notified soon.", 
             data: application
           });
        } catch (error) {
           console.log("Error in submitOnlineAdmission", error);
           res.status(500).json({
             success:false, 
             message: error.message || "Failed to submit application. Please try again later"
           })
       }
    },

    // ─── ADMIN ROUTES (Auth Required) ─────────────────────────────────────────────

    getAllSchools: async(req,res)=>{
         try {
            const schools= await School.find().select(['-_id','-password','-email','-owner_name','-createdAt']);
            res.status(200).json({success:true, message:"Success in fetching all  Schools", data:schools})
         } catch (error) {
            console.log("Error in getAllSchools", error);
            res.status(500).json({success:false, message:"Server Error in Getting All Schools. Try later"})
        }

    },
    registerSchool: async (req, res) => {
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
            try {
                console.log(fields, "fields");
                
                const existingSchool = await School.find({ email: fields.email });
                if (existingSchool.length > 0) {
                    return res.status(500).json({ success: false, message: "Email Already Exist!" });
                }

                const photo = files.image[0];
                let oldPath = photo.filepath;

                // Upload to Cloudinary
                const imageUrl = await uploadToCloudinary(oldPath, "school");

                var salt = bcrypt.genSaltSync(10);
                var hashPassword = bcrypt.hashSync(fields.password[0], salt);

                const newSchool = new School({
                    school_name: fields.school_name[0],
                    email: fields.email[0],
                    owner_name: fields.owner_name[0],
                    address: fields.address ? fields.address[0] : '',
                    password: hashPassword,
                    school_image: imageUrl
                });

                const savedData = await newSchool.save();
                console.log("Data saved", savedData);
                res.status(200).json({ success: true, data: savedData, message: "School is Registered Successfully." });
            } catch (e) {
                console.log("ERROR in Register", e);
                res.status(500).json({ success: false, message: "Failed Registration." });
            }
        });
    },
    loginSchool: async (req, res) => {
        School.find({ email: req.body.email }).then(resp => {
            if (resp.length > 0) {
                const isAuth = bcrypt.compareSync(req.body.password, resp[0].password);
                if (isAuth) {   
                    const token = jwt.sign(
                        {
                            id: resp[0]._id,
                            schoolId:resp[0]._id,
                            school_name: resp[0].school_name,
                            owner_name:resp[0].owner_name,
                            image_url: resp[0].school_image,
                            role:'SCHOOL'
                        }, jwtSecret );

                   res.header("Authorization", token);
                   res.status(200).json({ success: true, message: "Success Login", 
                    user: {
                         id: resp[0]._id, 
                         owner_name:resp[0].owner_name, 
                         school_name: resp[0].school_name,
                          image_url: resp[0].school_image, 
                          role: "SCHOOL" } })
                }else {
                    res.status(401).json({ success: false, message: "Password doesn't match." })
                }

            } else {
                res.status(401).json({ success: false, message: "Email not registerd." })
            }
        })
    },
    getSchoolOwnData: async(req, res)=>{
        const id = req.user.id;
        School.findById(id).then(resp=>{
            if(resp){
                res.status(200).json({success:true, data:resp})
            }else {
                res.status(500).json({ success: false, message: "School data not Available" })
            }
        }).catch(e=>{
            console.log("Error in getSchoolWithId", e)
            res.status(500).json({ success: false, message: "Error in getting  School Data" })
        })
    },

    updateSchoolWithId: async (req, res) => {
        const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
        
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(400).json({ message: "Error parsing the form data." });
            }
            
            try {
                const id = req.user.id;
                const school = await School.findById(id);

                if (!school) {
                    return res.status(404).json({ message: "School not found." });
                }

                // Update text fields
                Object.keys(fields).forEach((field) => {
                    school[field] = fields[field][0];
                });

                // Handle image file if provided
                if (files.image) {
                    // Delete old image from Cloudinary
                    if (school.school_image) {
                        await deleteFromCloudinary(school.school_image);
                    }

                    // Upload new image to Cloudinary
                    let filepath = files.image[0].filepath;
                    const imageUrl = await uploadToCloudinary(filepath, "school");
                    school.school_image = imageUrl;
                }

                // Save the updated school document
                await school.save();
                res.status(200).json({ message: "School updated successfully", data: school });
            } catch (e) {
                console.log(e);
                res.status(500).json({ message: "Error updating school details." });
            }
        });
    },
    signOut:async(req, res)=>{
       

        try {
            res.header("Authorization",  "");
            res.status(200).json({success:true, message:"School Signed Out  Successfully."})
        } catch (error) {
            console.log("Error in Sign out", error);
            res.status(500).json({success:false, message:"Server Error in Signing Out. Try later"})
        }
    },
    isSchoolLoggedIn: async(req,  res)=>{
        try {
            let token = req.header("Authorization");
            if(token){
                var decoded = jwt.verify(token, jwtSecret);
                console.log(decoded)
                if(decoded){
                    res.status(200).json({success:true,  data:decoded, message:"School is a logged in One"})
                }else{
                    res.status(401).json({success:false, message:"You are not Authorized."})
                }
            }else{
                res.status(401).json({success:false, message:"You are not Authorized."})
            }
        } catch (error) {
            console.log("Error in isSchoolLoggedIn", error);
            res.status(500).json({success:false, message:"Server Error in School Logged in check. Try later"})
        }
    }
}
