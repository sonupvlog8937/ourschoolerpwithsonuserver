const express = require("express");
const authMiddleware = require('../../auth/auth');
const { 
  getAllSchools, 
  updateSchoolWithId,
  signOut,
  isSchoolLoggedIn, 
  registerSchool, 
  loginSchool, 
  getSchoolOwnData,
  getTopSchools,
  getAllSchoolsPublic,
  getSchoolDetailsPublic,
  submitOnlineAdmission,
} = require("../../controller/role/school.controller");

const router = express.Router();

// ─── PUBLIC ROUTES (No Auth) ──────────────────────────────────────────────────
router.get('/public/top', getTopSchools);
router.get('/public/all', getAllSchoolsPublic);
router.get('/public/:id', getSchoolDetailsPublic);
router.post('/public/apply', submitOnlineAdmission);

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
router.post('/register', registerSchool);
router.get("/all", getAllSchools);
router.post("/login", loginSchool);
router.patch("/update",authMiddleware(['SCHOOL']), updateSchoolWithId);
router.get("/fetch-single",authMiddleware(['SCHOOL']),getSchoolOwnData);
router.get("/sign-out", signOut);
router.get("/is-login",  isSchoolLoggedIn)

module.exports = router;