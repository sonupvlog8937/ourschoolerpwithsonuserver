const express = require("express");
const router = express.Router();
const auth = require("../../auth/auth");
const ctrl = require("../../controller/frontOffice/setup.controller");

// ─── Purpose Routes ───────────────────────────────────────────────────────────
router.get("/purpose", auth(["SCHOOL", "TEACHER"]), ctrl.purpose.getAll);
router.post("/purpose", auth(["SCHOOL", "TEACHER"]), ctrl.purpose.create);
router.get("/purpose/:id", auth(["SCHOOL", "TEACHER"]), ctrl.purpose.getById);
router.put("/purpose/:id", auth(["SCHOOL", "TEACHER"]), ctrl.purpose.update);
router.delete("/purpose/:id", auth(["SCHOOL", "TEACHER"]), ctrl.purpose.delete);

// ─── Complaint Type Routes ────────────────────────────────────────────────────
router.get("/complaint-type", auth(["SCHOOL", "TEACHER"]), ctrl.complaintType.getAll);
router.post("/complaint-type", auth(["SCHOOL", "TEACHER"]), ctrl.complaintType.create);
router.get("/complaint-type/:id", auth(["SCHOOL", "TEACHER"]), ctrl.complaintType.getById);
router.put("/complaint-type/:id", auth(["SCHOOL", "TEACHER"]), ctrl.complaintType.update);
router.delete("/complaint-type/:id", auth(["SCHOOL", "TEACHER"]), ctrl.complaintType.delete);

// ─── Source Routes ────────────────────────────────────────────────────────────
router.get("/source", auth(["SCHOOL", "TEACHER"]), ctrl.source.getAll);
router.post("/source", auth(["SCHOOL", "TEACHER"]), ctrl.source.create);
router.get("/source/:id", auth(["SCHOOL", "TEACHER"]), ctrl.source.getById);
router.put("/source/:id", auth(["SCHOOL", "TEACHER"]), ctrl.source.update);
router.delete("/source/:id", auth(["SCHOOL", "TEACHER"]), ctrl.source.delete);

// ─── Reference Routes ─────────────────────────────────────────────────────────
router.get("/reference", auth(["SCHOOL", "TEACHER"]), ctrl.reference.getAll);
router.post("/reference", auth(["SCHOOL", "TEACHER"]), ctrl.reference.create);
router.get("/reference/:id", auth(["SCHOOL", "TEACHER"]), ctrl.reference.getById);
router.put("/reference/:id", auth(["SCHOOL", "TEACHER"]), ctrl.reference.update);
router.delete("/reference/:id", auth(["SCHOOL", "TEACHER"]), ctrl.reference.delete);

module.exports = router;
