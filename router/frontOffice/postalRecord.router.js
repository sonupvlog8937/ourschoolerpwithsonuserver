const express = require("express");
const router  = express.Router();
const auth    = require("../../auth/auth");
const ctrl    = require("../../controller/frontOffice/postalRecord.controller");

router.get   ("/",            auth(["SCHOOL", "TEACHER"]), ctrl.getAllRecords);
router.post  ("/",            auth(["SCHOOL", "TEACHER"]), ctrl.createRecord);
router.get   ("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.getRecordById);
router.put   ("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.updateRecord);
router.delete("/bulk-delete", auth(["SCHOOL"]),            ctrl.bulkDelete);
router.delete("/:id",         auth(["SCHOOL", "TEACHER"]), ctrl.deleteRecord);

module.exports = router;
