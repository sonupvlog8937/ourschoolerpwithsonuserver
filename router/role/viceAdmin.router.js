const express = require("express");
const router  = express.Router();
const auth    = require("../../auth/auth");
const ctrl    = require("../../controller/role/viceAdmin.controller");

// Public
router.post("/login",    ctrl.loginViceAdmin);

// Vice Admin's own routes
router.get("/me",        auth(["VICEADMIN"]),          ctrl.getMyDetails);

// School admin manages vice admins
router.post("/register", auth(["SCHOOL"]),              ctrl.registerViceAdmin);
router.get("/all",       auth(["SCHOOL"]),              ctrl.getAllViceAdmins);
router.get("/:id",       auth(["SCHOOL", "VICEADMIN"]), ctrl.getViceAdminById);
router.put("/:id",       auth(["SCHOOL", "VICEADMIN"]), ctrl.updateViceAdmin);
router.patch("/:id/permissions", auth(["SCHOOL"]),      ctrl.updatePermissions);
router.patch("/:id/toggle-status", auth(["SCHOOL"]),    ctrl.toggleStatus);
router.delete("/:id",    auth(["SCHOOL"]),              ctrl.deleteViceAdmin);

module.exports = router;
