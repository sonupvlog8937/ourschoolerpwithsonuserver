const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/account.controller");

const router = express.Router();
const roles = ["SCHOOL", "VICEADMIN", "VICE_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"];

router.get("/:resource", authMiddleware(roles), controller.list);
router.post("/:resource", authMiddleware(roles), controller.create);
router.put("/:resource/:id", authMiddleware(roles), controller.update);
router.delete("/:resource/:id", authMiddleware(roles), controller.remove);

module.exports = router;
