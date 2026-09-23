const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/studentProfile.controller");

const router = express.Router();
const roles = ["SCHOOL", "VICEADMIN", "VICE_ADMIN", "TEACHER", "STUDENT", "PARENT"];
router.get("/:resource", authMiddleware(roles), controller.list);
router.post("/:resource", authMiddleware(roles), controller.create);
router.put("/:resource/:id", authMiddleware(roles), controller.update);
router.delete("/:resource/:id", authMiddleware(roles), controller.remove);
module.exports = router;