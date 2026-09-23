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
                    school_image: imageUrl,
                    status: 'pending'  // ✅ New school registration starts as pending
                });

                const savedData = await newSchool.save();
                console.log("Data saved", savedData);
                res.status(200).json({ 
                    success: true, 
                    data: savedData, 
                    message: "School registration submitted successfully. You will be notified once your application is reviewed by our team." 
                });
            } catch (e) {
                console.log("ERROR in Register", e);
                res.status(500).json({ success: false, message: "Failed Registration." });
            }
        });
    },
    loginSchool: async (req, res) => {
        School.find({ email: req.body.email }).then(resp => {
            if (resp.length > 0) {
                // ✅ Check if school is approved
                if (resp[0].status === 'pending') {
                    return res.status(403).json({ 
                        success: false, 
                        message: "Your school registration is pending approval. You will be able to login once approved by our team." 
                    });
                }
                
                if (resp[0].status === 'rejected') {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Your school registration has been rejected. Reason: ${resp[0].rejectionReason || 'Please contact support for more information.'}` 
                    });
                }

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
                        }, jwtSecret, { expiresIn: '30d' });

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

                const editableFields = new Set([
                    "school_name", "email", "address", "shortName", "affiliationNo", "registrationNo",
                    "officeNo", "helpNo", "websiteAddress", "facebookLink", "instagramLink", "twitterLink",
                    "youtubeLink", "registrationDescription", "apiBiometric", "apiBiometricKey",
                    "apiBiometricSecret", "saturdayWorking", "sundayWorking",
                ]);
                Object.keys(fields).forEach((field) => {
                    // Skip status field completely to avoid validation errors
                    if (field === 'status') return;
                    if (!editableFields.has(field)) return;
                    const value = fields[field];
                    school[field] = Array.isArray(value) ? value[0] : value;
                });

                const imageFields = ["image", "principalSignature", "dashboardBackground", "boardLogo", "welcomeCard"];
                for (const field of imageFields) {
                    if (!files[field]) continue;
                    const modelField = field === "image" ? "school_image" : field;
                    if (school[modelField]) await deleteFromCloudinary(school[modelField]);
                    const uploadedFile = Array.isArray(files[field]) ? files[field][0] : files[field];
                    school[modelField] = await uploadToCloudinary(uploadedFile.filepath, "school");
                }

                // Normalize legacy records before Mongoose validates the document.
                if (typeof school.status === "string") {
                    school.status = school.status.toLowerCase();
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
    },

    // ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
    getDashboardStats: async (req, res) => {
        try {
            const schoolId = req.user.schoolId;

            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Import models
            const StudentAdmission = require('../../model/studentInformation/studentAdmission.model');
            const Teacher = require('../../model/role/teacher.model');
            const Attendance = require('../../model/attendance.model');
            const FeePayment = require('../../model/feeCollections/feePayment.model');
            const FeeCollection = require('../../model/feeCollections/feeCollection.model');
            const Complaint = require('../../model/frontOffice/complaint.model');
            const LibraryBook = require('../../model/library.model');
            const TransportRoute = require('../../model/transport.model');
            const Leave = require('../../model/leave.model');

            // Parallel data fetching for better performance
            const [
                totalStudents,
                totalTeachers,
                todayAttendance,
                totalAttendanceRecords,
                todayPayments,
                feeDueStudents,
                newAdmissions,
                complaints,
                libraryBooks,
                transportRoutes,
                studentsWithTransport,
                genderCounts,
                staffLeaves
            ] = await Promise.all([
                // Total students
                StudentAdmission.countDocuments({ school: schoolId, status: 'Active' }),

                // Total teachers
                Teacher.countDocuments({ school: schoolId }),

                // Today's attendance (present)
                Attendance.countDocuments({ 
                    school: schoolId, 
                    date: { $gte: today, $lt: tomorrow },
                    status: 'Present'
                }),

                // Total attendance records for today
                Attendance.countDocuments({ 
                    school: schoolId, 
                    date: { $gte: today, $lt: tomorrow }
                }),

                // Today's fee collection
                FeePayment.aggregate([
                    {
                        $match: {
                            school: new require('mongoose').Types.ObjectId(schoolId),
                            paymentDate: { $gte: today, $lt: tomorrow },
                            isReverted: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]),

                // Students with pending fees
                FeeCollection.countDocuments({
                    school: schoolId,
                    status: { $in: ['Pending', 'Partial'] }
                }),

                // New admissions (last 30 days)
                StudentAdmission.countDocuments({
                    school: schoolId,
                    admissionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }),

                // Open complaints
                Complaint.countDocuments({
                    school: schoolId,
                    status: { $in: ['Open', 'In Progress'] }
                }),

                // Library books count
                LibraryBook.countDocuments({ school: schoolId }),

                // Transport routes count
                TransportRoute.countDocuments({ school: schoolId, status: 'Active' }),

                // Students using transport
                StudentAdmission.countDocuments({ school: schoolId, transportEnabled: true }),

                // Gender distribution
                StudentAdmission.aggregate([
                    { $match: { school: new require('mongoose').Types.ObjectId(schoolId), status: 'Active' } },
                    {
                        $group: {
                            _id: '$gender',
                            count: { $sum: 1 }
                        }
                    }
                ]),

                // Staff leaves for today
                Leave.countDocuments({
                    school: schoolId,
                    applicant_type: 'Teacher',
                    status: 'Approved',
                    from_date: { $lte: today },
                    to_date: { $gte: today }
                })
            ]);

            // Calculate attendance percentage
            const todayAttendancePercentage = totalAttendanceRecords > 0 
                ? ((todayAttendance / totalAttendanceRecords) * 100).toFixed(2)
                : 0;

            // Calculate absent today
            const absentToday = totalAttendanceRecords - todayAttendance;

            // Today's collection amount
            const todayCollection = todayPayments.length > 0 ? todayPayments[0].total : 0;

            // Process gender ratio
            const genderRatio = { boys: 0, girls: 0 };
            genderCounts.forEach(item => {
                if (item._id && item._id.toLowerCase() === 'male') {
                    genderRatio.boys = item.count;
                } else if (item._id && item._id.toLowerCase() === 'female') {
                    genderRatio.girls = item.count;
                }
            });

            // Get birthdays today (students born on this day/month)
            const birthdaysToday = await StudentAdmission.countDocuments({
                school: schoolId,
                status: 'Active',
                $expr: {
                    $and: [
                        { $eq: [{ $dayOfMonth: '$dateOfBirth' }, today.getDate()] },
                        { $eq: [{ $month: '$dateOfBirth' }, today.getMonth() + 1] }
                    ]
                }
            });

            // Calculate staff attendance (teachers present = total - on leave)
            const staffPresent = totalTeachers - staffLeaves;
            const staffAbsent = 0; // We don't track teacher absent separately
            const staffLeave = staffLeaves;

            // Calculate fee percentages (total vs collected)
            const totalFeeData = await FeeCollection.aggregate([
                { $match: { school: new require('mongoose').Types.ObjectId(schoolId) } },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        paidAmount: { $sum: '$paidAmount' }
                    }
                }
            ]);

            const feeCollected = totalFeeData.length > 0 && totalFeeData[0].totalAmount > 0
                ? ((totalFeeData[0].paidAmount / totalFeeData[0].totalAmount) * 100).toFixed(2)
                : 0;
            const feePending = totalFeeData.length > 0 && totalFeeData[0].totalAmount > 0
                ? (((totalFeeData[0].totalAmount - totalFeeData[0].paidAmount) / totalFeeData[0].totalAmount) * 100).toFixed(2)
                : 0;

            // Prepare response data
            const dashboardData = {
                totalStudents,
                totalTeachers,
                totalStaff: totalTeachers, // Assuming teachers = staff for now
                todayAttendancePercentage: parseFloat(todayAttendancePercentage),
                todayCollection,
                absentToday,
                feeDueStudents,
                newAdmissions,
                complaints,
                birthdays: birthdaysToday,
                libraryBooks,
                vehicles: {
                    routes: transportRoutes,
                    students: studentsWithTransport
                },
                upcomingHolidays: 0, // No holiday model found
                genderRatio,
                staffPresent,
                staffAbsent,
                staffLeave,
                feeCollected: parseFloat(feeCollected),
                feePending: parseFloat(feePending),
                pendingItems: {
                    feeDues: feeDueStudents,
                    complaints,
                    overdueDocs: 0 // No document tracking found
                }
            };

            res.status(200).json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.log("Error in getDashboardStats", error);
            res.status(500).json({
                success: false,
                message: "Server Error in Getting Dashboard Stats. Try later"
            });
        }
    }
}
