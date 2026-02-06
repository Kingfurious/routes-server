const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const {
  acceptTask,
  rejectTask,
  startTask,
  completeTask,
  getAvailableTasks,
  getActiveTask,
  getTaskById,
  startLocationTracking,
  sendLocationUpdate,
  stopLocationTracking,
  setRunnerStatus,
} = require("../controllers/runnerTaskController");

// Runner task lifecycle endpoints
router.post("/:taskId/accept", authenticateToken, acceptTask);
router.post("/:taskId/reject", authenticateToken, rejectTask);
router.post("/:taskId/start", authenticateToken, startTask);
router.post("/:taskId/complete", authenticateToken, completeTask);

// Runner status endpoint (must be before /:taskId routes)
router.post("/status", authenticateToken, setRunnerStatus);

// Runner task feed endpoints (must be before /:taskId routes)
router.get("/available", authenticateToken, getAvailableTasks);
router.get("/active", authenticateToken, getActiveTask);

// Location tracking endpoints (must be before /:taskId route)
router.post("/:taskId/location/start", authenticateToken, startLocationTracking);
router.post("/:taskId/location/update", authenticateToken, sendLocationUpdate);
router.post("/:taskId/location/stop", authenticateToken, stopLocationTracking);

// Task-specific endpoints (must be last to avoid route conflicts)
router.get("/:taskId", authenticateToken, getTaskById);

module.exports = router;
