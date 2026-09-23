const express = require("express");
const authMiddleware = require("../../auth/auth");
const controller = require("../../controller/dashboard/additionalDashboard.controller");

const router = express.Router();
const schoolOnly = authMiddleware(["SCHOOL"]);

router.get("/follow-up", schoolOnly, controller.getFollowUpDashboard);
router.get("/complaint", schoolOnly, controller.getComplaintDashboard);
router.get("/visitor", schoolOnly, controller.getVisitorDashboard);
router.get("/chat", schoolOnly, controller.getChatDashboard);
router.get("/user-activity", schoolOnly, controller.getUserActivityDashboard);

module.exports = router;
