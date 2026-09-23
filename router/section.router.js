const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/section.controller");

const router = express.Router();
const schoolOnly = authMiddleware(["SCHOOL"]);
router.get("/", schoolOnly, controller.getSections);
router.post("/", schoolOnly, controller.createSection);
router.put("/positions", schoolOnly, controller.savePositions);
router.put("/:id", schoolOnly, controller.updateSection);
router.delete("/:id", schoolOnly, controller.deleteSection);
module.exports = router;
