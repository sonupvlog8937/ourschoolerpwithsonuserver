const express = require("express");
const router = express.Router();
const authMiddleware = require("../../auth/auth");
const accountantController = require("../../controller/role/accountant.controller");

router.post("/register", authMiddleware(["SCHOOL"]), accountantController.registerAccountant);
router.post("/login", accountantController.loginAccountant);
router.get("/all", authMiddleware(["SCHOOL"]), accountantController.getAllAccountants);
router.get("/details", authMiddleware(["ACCOUNTANT"]), accountantController.getAccountantDetails);
router.put("/:id", authMiddleware(["SCHOOL", "ACCOUNTANT"]), accountantController.updateAccountant);
router.delete("/:id", authMiddleware(["SCHOOL"]), accountantController.deleteAccountant);

module.exports = router;
