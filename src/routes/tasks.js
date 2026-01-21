const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { getCreateTaskMetadata } = require("../controllers/taskMetadataController");
const { createTask, getMyTasks } = require("../controllers/taskController");

// Public metadata endpoint for Create Task flow
router.get("/metadata", getCreateTaskMetadata);

// Authenticated task endpoints
router.post("/", authenticateToken, createTask);
router.get("/my", authenticateToken, getMyTasks);

module.exports = router;

