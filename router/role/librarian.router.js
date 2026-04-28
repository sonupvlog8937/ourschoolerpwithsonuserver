const express = require("express");
const router = express.Router();
const authMiddleware = require("../../auth/auth");
const librarianController = require("../../controller/role/librarian.controller");

router.post("/register", authMiddleware(["SCHOOL"]), librarianController.registerLibrarian);
router.post("/login", librarianController.loginLibrarian);
router.get("/all", authMiddleware(["SCHOOL"]), librarianController.getAllLibrarians);
router.get("/details", authMiddleware(["LIBRARIAN"]), librarianController.getLibrarianDetails);
router.put("/:id", authMiddleware(["SCHOOL", "LIBRARIAN"]), librarianController.updateLibrarian);
router.delete("/:id", authMiddleware(["SCHOOL"]), librarianController.deleteLibrarian);

module.exports = router;
