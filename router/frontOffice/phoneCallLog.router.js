const express = require("express");
const router  = express.Router();
const auth    = require("../../auth/auth");
const ctrl    = require("../../controller/frontOffice/phoneCallLog.controller");

router.get   ("/",           auth(["SCHOOL", "TEACHER"]), ctrl.getAllLogs);
router.post  ("/",           auth(["SCHOOL", "TEACHER"]), ctrl.createLog);
router.get   ("/:id",        auth(["SCHOOL", "TEACHER"]), ctrl.getLogById);
router.put   ("/:id",        auth(["SCHOOL", "TEACHER"]), ctrl.updateLog);
router.delete("/bulk-delete",auth(["SCHOOL"]),            ctrl.bulkDelete);
router.delete("/:id",        auth(["SCHOOL", "TEACHER"]), ctrl.deleteLog);

module.exports = router;
