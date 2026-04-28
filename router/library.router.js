const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const libraryController = require("../controller/library.controller");

// Book routes
router.post("/book/add", authMiddleware(["SCHOOL"]), libraryController.addBook);
router.get("/book/all", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), libraryController.getAllBooks);
router.get("/book/:id", authMiddleware(["SCHOOL", "TEACHER", "STUDENT"]), libraryController.getBookById);
router.put("/book/:id", authMiddleware(["SCHOOL"]), libraryController.updateBook);
router.delete("/book/:id", authMiddleware(["SCHOOL"]), libraryController.deleteBook);

// Issue/Return routes
router.post("/issue", authMiddleware(["SCHOOL"]), libraryController.issueBook);
router.put("/return/:issueId", authMiddleware(["SCHOOL"]), libraryController.returnBook);
router.get("/issued/all", authMiddleware(["SCHOOL", "TEACHER"]), libraryController.getAllIssuedBooks);

module.exports = router;
