const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/masterConfiguration.controller");

const router = express.Router();
const schoolOnly = authMiddleware(["SCHOOL"]);
router.get("/:module", schoolOnly, controller.getModule);
router.post("/:module", schoolOnly, controller.createModuleRecord);
router.put("/:module/:id", schoolOnly, controller.updateModuleRecord);
router.delete("/:module/:id", schoolOnly, controller.deleteModuleRecord);
module.exports = router;
