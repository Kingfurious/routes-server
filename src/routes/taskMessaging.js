const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { sendMessage } = require("../controllers/taskMessagingController");

// Messaging endpoint (shared by customer and runner)
router.post("/:taskId/messages", authenticateToken, sendMessage);

module.exports = router;
