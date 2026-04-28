const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const studyMaterialController = require("../controller/studyMaterial.controller");

// Study material routes
router.post("/upload", authMiddleware(["SCHOOL", "TEACHER"]), studyMaterialController.uploadMaterial);
router.get("/all", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), studyMaterialController.getAllMaterials);
router.get("/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), studyMaterialController.getMaterialById);
router.put("/:id", authMiddleware(["SCHOOL", "TEACHER"]), studyMaterialController.updateMaterial);
router.delete("/:id", authMiddleware(["SCHOOL", "TEACHER"]), studyMaterialController.deleteMaterial);
router.post("/:id/download", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), studyMaterialController.incrementDownload);

module.exports = router;
