const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { getCreateTaskMetadata } = require("../controllers/taskMetadataController");
const {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// Public metadata endpoint for Create Task flow
router.get("/metadata", getCreateTaskMetadata);

// Authenticated task endpoints
router.post("/", authenticateToken, createTask);
router.get("/my", authenticateToken, getMyTasks);

// Task CRUD operations (must be after /my to avoid route conflicts)
router.get("/:taskId", authenticateToken, getTaskById);
router.put("/:taskId", authenticateToken, updateTask);
router.delete("/:taskId", authenticateToken, deleteTask);

module.exports = router;

