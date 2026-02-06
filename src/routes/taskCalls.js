const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { initiateCall, endCall, getCallToken } = require("../controllers/taskCallController");

// Call endpoints (shared by customer and runner)
router.post("/:taskId/call/initiate", authenticateToken, initiateCall);
router.post("/:taskId/call/end", authenticateToken, endCall);
router.post("/:taskId/call/token", authenticateToken, getCallToken);

module.exports = router;
