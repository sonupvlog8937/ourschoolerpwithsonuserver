const express = require("express");
const router = express.Router();
const authMiddleware = require("../../auth/auth");
const receptionistController = require("../../controller/role/receptionist.controller");

router.post("/register", authMiddleware(["SCHOOL"]), receptionistController.registerReceptionist);
router.post("/login", receptionistController.loginReceptionist);
router.get("/all", authMiddleware(["SCHOOL"]), receptionistController.getAllReceptionists);
router.get("/details", authMiddleware(["RECEPTIONIST"]), receptionistController.getReceptionistDetails);
router.put("/:id", authMiddleware(["SCHOOL", "RECEPTIONIST"]), receptionistController.updateReceptionist);
router.delete("/:id", authMiddleware(["SCHOOL"]), receptionistController.deleteReceptionist);

module.exports = router;
