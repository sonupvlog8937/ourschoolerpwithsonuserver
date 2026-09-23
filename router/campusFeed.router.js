const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/campusFeed.controller");

const router = express.Router();
const roles = ["SCHOOL", "VICEADMIN", "VICE_ADMIN", "TEACHER", "STUDENT", "PARENT", "RECEPTIONIST", "ACCOUNTANT", "LIBRARIAN"];

router.get("/", authMiddleware(roles), controller.getFeed);
router.post("/posts", authMiddleware(roles), controller.createPost);
router.post("/posts/:id/like", authMiddleware(roles), controller.toggleLike);
router.post("/posts/:id/comments", authMiddleware(roles), controller.addComment);
router.delete("/posts/:id", authMiddleware(roles), controller.removePost);

module.exports = router;