const express = require("express");
const router = express.Router();
const authMiddleware = require('../auth/auth');
const {
  createChangeArrangement,
  getAllChangeArrangements,
  updateChangeArrangement,
  deleteChangeArrangement,
} = require("../controller/changeArrangement.controller");

// Create change arrangement
router.post("/create", authMiddleware(['SCHOOL']), createChangeArrangement);

// Get all change arrangements
router.get("/fetch-all", authMiddleware(['SCHOOL']), getAllChangeArrangements);

// Update change arrangement
router.patch("/update/:id", authMiddleware(['SCHOOL']), updateChangeArrangement);

// Delete change arrangement
router.delete("/delete/:id", authMiddleware(['SCHOOL']), deleteChangeArrangement);

module.exports = router;