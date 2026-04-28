const express = require("express");
const router  = express.Router();
const auth    = require("../../auth/auth");
const ctrl    = require("../../controller/frontOffice/complaint.controller");

router.get   ("/",            auth(["SCHOOL", "TEACHER"]), ctrl.getAllComplaints);
router.post  ("/",            auth(["SCHOOL", "TEACHER"]), ctrl.createComplaint);
router.get   ("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.getComplaintById);
router.put   ("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.updateComplaint);
router.patch ("/:id/status",  auth(["SCHOOL", "TEACHER"]), ctrl.updateStatus);
router.delete("/bulk-delete", auth(["SCHOOL"]),            ctrl.bulkDelete);
router.delete("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.deleteComplaint);

module.exports = router;
