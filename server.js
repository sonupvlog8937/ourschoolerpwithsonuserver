require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser  = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");

// ROUTERS
const schoolRouter = require("./router/role/school.router")
const studentRouter = require("./router/role/student.router")
const classRouter = require("./router/class.router")
const subjectRouter = require("./router/subject.router")
const teacherRouter = require('./router/role/teacher.router')
const examRouter =  require('./router/examination.router')
const attendanceRoutes = require('./router/attendance.router');
const periodRoutes = require("./router/period.router");
const noticeRoutes = require("./router/notice.router");
const admissionEnquiryRoutes = require("./router/frontOffice/admissionEnquiry.router");
const visitorBookRoutes      = require("./router/frontOffice/visitorBook.router");
const phoneCallLogRoutes     = require("./router/frontOffice/phoneCallLog.router");
const postalRecordRoutes     = require("./router/frontOffice/postalRecord.router");
const complaintRoutes        = require("./router/frontOffice/complaint.router");
const setupRoutes            = require("./router/frontOffice/setup.router");
const viceAdminRoutes        = require("./router/role/viceAdmin.router");
const homeworkRoutes = require("./router/homework.router");
const studyMaterialRoutes = require("./router/studyMaterial.router");
const leaveRoutes = require("./router/leave.router");
const transportRoutes = require("./router/transport.router");
const libraryRoutes = require("./router/library.router");
const accountantRoutes = require("./router/role/accountant.router");
const parentRoutes = require("./router/role/parent.router");
const superAdminRoutes = require("./router/role/superAdmin.router");
const receptionistRoutes = require("./router/role/receptionist.router");
const librarianRoutes = require("./router/role/librarian.router");
const studentAdmissionRoutes = require('./router/studentInformation/studentAdmission.router');
const studentSettingsRoutes = require('./router/studentInformation/studentSettings.router');
const onlineAdmissionRoutes = require('./router/studentInformation/onlineAdmission.router');
const feeCollectionRoutes = require('./router/feeCollections/feeCollection.router');
const feeDiscountRoutes = require('./router/feeCollections/feeDiscount.router');
const feeCarryForwardRoutes = require('./router/feeCollections/feeCarryForward.router');
const feeAssignmentRoutes = require('./router/feeAssignment.router');
const inventoryDashboardRoutes = require('./router/inventoryDashboard.router');
const passwordResetRoutes = require('./router/passwordReset.router');
const dashboardRoutes = require('./router/dashboard/dashboard.router');
const additionalDashboardRoutes = require('./router/dashboard/additionalDashboard.router');
const masterConfigurationRoutes = require('./router/masterConfiguration.router');
const sectionRoutes = require('./router/section.router');
const communicationRoutes = require('./router/communication.router');
const campusFeedRoutes = require('./router/campusFeed.router');
const studentProfileRoutes = require('./router/studentProfile.router');
const studentActivityRoutes = require('./router/studentActivity.router');
const studentInfoRoutes = require('./router/studentInfo.router');
const studentFeeRoutes = require('./router/studentFee.router');
const studentBankRoutes = require('./router/studentBank.router');
const accountRoutes = require('./router/account.router');
const storeRoomRoutes = require('./router/storeRoom.router');
const inventoryRoutes = require('./router/inventory.router');
const humanResourceRoutes = require('./router/humanResource.router');
const leaveResourceRoutes = require('./router/leaveResource.router');
const timetableResourceRoutes = require('./router/timetableResource.router');
const reportResourceRoutes = require('./router/reportResource.router');
const curriculumPlanningRoutes = require('./router/curriculumPlanning.router');
const examRoutes = require('./router/exam.router');
const classTeacherRoutes = require('./router/classTeacher.router');
const changeArrangementRoutes = require('./router/changeArrangement.router');
const { getRouter } = require('./router/genericResource.router');
const { authCheck } = require("./controller/auth.controller");

const app = express();

// middleware 
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const corsOptions = {exposedHeaders:"Authorization"}
app.use(cors(corsOptions));

// Serve uploaded images (saved in client/public/images)
app.use("/images", express.static(path.join(__dirname, "../client/public/images")));

// Health check (for Render / uptime pings)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// MONGODB CONNECTION
mongoose.connect(process.env.MONGODB).then(db=>{
    console.log("MongoDb is Connected Successfully.")
}).catch(e=>{
    console.log("MongoDb Error",e)
})



app.use("/api/school", schoolRouter)
app.use("/api/student", studentRouter)
app.use("/api/teacher", teacherRouter)
app.use("/api/class", classRouter)
app.use("/api/subject", subjectRouter)
app.use('/api/examination', examRouter)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/period',  periodRoutes)
app.use('/api/notices', noticeRoutes)
app.use('/api/admission-enquiry', admissionEnquiryRoutes)
app.use('/api/visitor-book',     visitorBookRoutes)
app.use('/api/phone-call-log',   phoneCallLogRoutes)
app.use('/api/postal-record',    postalRecordRoutes)
app.use('/api/complaint',        complaintRoutes)
app.use('/api/setup',            setupRoutes)
app.use('/api/vice-admin',       viceAdminRoutes)
app.use('/api/homework', homeworkRoutes)
app.use('/api/study-material', studyMaterialRoutes)
app.use('/api/leave', leaveRoutes)
app.use('/api/transport', transportRoutes)
app.use('/api/library', libraryRoutes)
app.use('/api/accountant', accountantRoutes)
app.use('/api/parent', parentRoutes)
app.use('/api/super-admin', superAdminRoutes)
app.use('/api/receptionist', receptionistRoutes)
app.use('/api/librarian', librarianRoutes)
app.use('/api/students', studentAdmissionRoutes)
app.use('/api/student-settings', studentSettingsRoutes)
app.use('/api/school/settings', studentSettingsRoutes)
app.use('/api/school/online-admissions', onlineAdmissionRoutes)
app.use('/api/fee-collection', feeCollectionRoutes)
app.use('/api/fee-discounts', feeDiscountRoutes)
app.use('/api/fee-carry-forward', feeCarryForwardRoutes)
app.use('/api/fee-assignment', feeAssignmentRoutes)
app.use('/api/inventory-dashboard', inventoryDashboardRoutes)
app.use('/api/auth', passwordResetRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/dashboard', additionalDashboardRoutes)
app.use('/api/master-config', masterConfigurationRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/communicate', communicationRoutes)
app.use('/api/campus-feed', campusFeedRoutes)
app.use('/api/student-profile', studentProfileRoutes)
app.use('/api/student-activity', studentActivityRoutes)
app.use('/api/student-info', studentInfoRoutes)
app.use('/api/student-fee', studentFeeRoutes)
app.use('/api/student-bank', studentBankRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/store-room', storeRoomRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/human-resource', humanResourceRoutes)
app.use('/api/leave-resource', leaveResourceRoutes)
app.use('/api/timetable-resource', timetableResourceRoutes)
app.use('/api/report-resource', reportResourceRoutes)
app.use('/api/transport-resource', getRouter('transport'))
app.use('/api/hostel-resource', getRouter('hostel'))
app.use('/api/library-resource', getRouter('library'))
app.use('/api/online-class-resource', getRouter('onlineClasses'))
app.use('/api/academic-content-resource', getRouter('academicContent'))
app.use('/api/import-export-resource', getRouter('importExport'))
app.use('/api/access-control-resource', getRouter('accessControl'))
app.use('/api/parent-account-resource', getRouter('parentAccounts'))
app.use('/api/website-configuration-resource', getRouter('websiteConfiguration'))
app.use('/api/behaviour-resource', getRouter('behaviour'))
app.use('/api/curriculum-planning', curriculumPlanningRoutes)
app.use('/api/exam', examRoutes)
app.use('/api/class-teacher', classTeacherRoutes)
app.use('/api/change-arrangement', changeArrangementRoutes)

app.get('/api/auth/check',authCheck)


const PORT = process.env.PORT || 5001;
app.listen(PORT, ()=>{
    console.log("Server is running at port =>",PORT)
})

/**
 * Optional keep-alive ping.
 *
 * NOTE: This cannot prevent Render free-tier cold starts by itself (when the process is asleep,
 * it can't run a timer). Use an external uptime monitor to hit /api/health periodically.
 *
 * To enable internal ping (useful on hosts that don't fully suspend the process):
 * - Set KEEP_ALIVE_URL to your deployed health URL, e.g. https://your-app.onrender.com/api/health
 * - Optionally set KEEP_ALIVE_INTERVAL_MS (default 840000 = 14min)
 */
// const keepAliveUrl = process.env.KEEP_ALIVE_URL;
// const keepAliveIntervalMs = Math.max(
//   parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || "840000", 10) || 840000,
//   60000
// );

// if (keepAliveUrl) {
//   const { request } = keepAliveUrl.startsWith("https:")
//     ? require("https")
//     : require("http");

//   setInterval(() => {
//     try {
//       const req = request(
//         keepAliveUrl,
//         { method: "GET", timeout: 15000, headers: { "User-Agent": "keep-alive" } },
//         (resp) => {
//           // drain data to free socket
//           resp.on("data", () => {});
//           resp.on("end", () => {});
//         }
//       );
//       req.on("timeout", () => req.destroy(new Error("keep-alive timeout")));
//       req.on("error", () => {});
//       req.end();
//     } catch {
//       // ignore
//     }
//   }, keepAliveIntervalMs).unref?.();

//   console.log(`[keep-alive] enabled: ${keepAliveUrl} every ${keepAliveIntervalMs}ms`);
// }