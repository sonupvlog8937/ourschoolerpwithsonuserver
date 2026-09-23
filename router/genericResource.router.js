const express = require("express");
const authMiddleware = require("../auth/auth");
const controller = require("../controller/genericResource.controller");

const roles = ["SCHOOL", "VICEADMIN", "VICE_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"];

const getRouter = (modelKey) => {
  const router = express.Router();
  router.get("/:resource", authMiddleware(roles), controller.list(modelKey));
  router.post("/:resource", authMiddleware(roles), controller.create(modelKey));
  router.put("/:resource/:id", authMiddleware(roles), controller.update(modelKey));
  router.delete("/:resource/:id", authMiddleware(roles), controller.remove(modelKey));
  return router;
};

module.exports = { getRouter };
