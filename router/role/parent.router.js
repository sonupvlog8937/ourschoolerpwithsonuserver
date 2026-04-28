const express = require("express");
const router = express.Router();
const authMiddleware = require("../../auth/auth");
const parentController = require("../../controller/role/parent.controller");

router.post("/register", authMiddleware(["SCHOOL"]), parentController.registerParent);
router.post("/login", parentController.loginParent);
router.get("/all", authMiddleware(["SCHOOL"]), parentController.getAllParents);
router.get("/details", authMiddleware(["PARENT"]), parentController.getParentDetails);
router.put("/:id", authMiddleware(["SCHOOL", "PARENT"]), parentController.updateParent);
router.delete("/:id", authMiddleware(["SCHOOL"]), parentController.deleteParent);
router.post("/link-child", authMiddleware(["SCHOOL"]), parentController.linkChild);

module.exports = router;
