const express = require("express");
const router  = express.Router();
const auth    = require("../../auth/auth");
const ctrl    = require("../../controller/role/superAdmin.controller");

// Public
router.post("/register", ctrl.registerSuperAdmin);
router.post("/login",    ctrl.loginSuperAdmin);

// Protected — SUPERADMIN only
router.get("/stats",                          auth(["SUPERADMIN"]), ctrl.getDashboardStats);
router.get("/schools",                        auth(["SUPERADMIN"]), ctrl.getAllSchools);
router.get("/schools/pending",                auth(["SUPERADMIN"]), ctrl.getPendingSchools);
router.get("/schools/:schoolId",              auth(["SUPERADMIN"]), ctrl.getSchoolById);
router.get("/schools/:schoolId/staff",        auth(["SUPERADMIN"]), ctrl.getSchoolStaff);
router.get("/schools/:schoolId/students",     auth(["SUPERADMIN"]), ctrl.getSchoolStudents);
router.post("/schools/:schoolId/approve",     auth(["SUPERADMIN"]), ctrl.approveSchool);
router.post("/schools/:schoolId/reject",      auth(["SUPERADMIN"]), ctrl.rejectSchool);
router.patch("/schools/:schoolId/toggle-status", auth(["SUPERADMIN"]), ctrl.toggleSchoolStatus);
router.delete("/schools/:schoolId",           auth(["SUPERADMIN"]), ctrl.deleteSchool);

module.exports = router;
