const express = require("express");
const authMiddleware = require("../../auth/auth");
const {
  createAdmissionEnquiry,
  fetchAdmissionEnquiries,
  updateAdmissionEnquiry,
  deleteAdmissionEnquiry,
} = require("../../controller/frontOffice/admissionEnquiry.controller");

const router = express.Router();

router.get("/", authMiddleware(["SCHOOL"]), fetchAdmissionEnquiries);
router.post("/", authMiddleware(["SCHOOL"]), createAdmissionEnquiry);
router.put("/:id", authMiddleware(["SCHOOL"]), updateAdmissionEnquiry);
router.delete("/:id", authMiddleware(["SCHOOL"]), deleteAdmissionEnquiry);

module.exports = router;
