const admin = require("firebase-admin");
const db = admin.firestore();
const {
  loadTask,
  assertRunnerOwnsTask,
  assertTaskStatus,
  nowTimestamp,
  normalizeStatus,
  canTrackLocation,
  enrichTaskWithCustomerName,
} = require("./helpers/taskAccess");
const { shouldThrottleLocationUpdate } = require("./helpers/locationUtils");

/**
 * POST /api/v1/runner/tasks/{taskId}/accept
 * Runner accepts a task
 */
const acceptTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Check if task is available (not already assigned or completed/cancelled)
    const status = normalizeStatus(taskData.status);
    if (status !== "created" && status !== "pending" && status !== "active") {
      return res.status(400).json({
        error: "Bad Request",
        message: `Task cannot be accepted. Current status: ${status}`,
      });
    }

    // Check if task is already assigned to someone else
    if (taskData.runnerId && taskData.runnerId !== uid) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Task is already assigned to another runner",
      });
    }

    const now = nowTimestamp();

    // Update task with runner assignment
    await taskRef.update({
      runnerId: uid,
      status: "accepted",
      acceptedAt: now,
      updatedAt: now,
      chatStatus: "active", // Enable chat when task is accepted
    });

    // Fetch updated task and enrich with customer name if missing
    const updatedDoc = await taskRef.get();
    const data = { id: updatedDoc.id, ...updatedDoc.data() };
    await enrichTaskWithCustomerName(data);

    return res.status(200).json({
      success: true,
      message: "Task accepted successfully",
      data,
    });
  } catch (error) {
    console.error("Error accepting task:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to accept task",
    });
  }
};

/**
 * POST /api/v1/runner/tasks/{taskId}/reject
 * Runner rejects/skips a task
 */
const rejectTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Check if task is available
    const status = normalizeStatus(taskData.status);
    if (status === "completed" || status === "cancelled") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot reject a completed or cancelled task",
      });
    }

    // Record rejection (for MVP, we can store in a simple array on the task)
    // In production, you might want a separate collection for rejections
    const rejections = taskData.runnerRejections || [];
    if (!rejections.includes(uid)) {
      rejections.push(uid);
    }

    await taskRef.update({
      runnerRejections: rejections,
      updatedAt: nowTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Task rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting task:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to reject task",
    });
  }
};

/**
 * POST /api/v1/runner/tasks/{taskId}/start
 * Runner starts a task (moves from accepted to in_progress)
 */
const startTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task
    assertRunnerOwnsTask(taskData, uid);

    // Verify task is in accepted status
    assertTaskStatus(taskData, ["accepted"]);

    const now = nowTimestamp();

    // Update task to in_progress
    await taskRef.update({
      status: "in_progress",
      startedAt: now,
      locationTrackingEnabled: true,
      updatedAt: now,
    });

    // Fetch updated task
    const updatedDoc = await taskRef.get();

    const data = { id: updatedDoc.id, ...updatedDoc.data() };
    await enrichTaskWithCustomerName(data);
    return res.status(200).json({
      success: true,
      message: "Task started successfully",
      data,
    });
  } catch (error) {
    console.error("Error starting task:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to start task",
    });
  }
};

/**
 * POST /api/v1/runner/tasks/{taskId}/complete
 * Runner completes a task
 */
const completeTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task
    assertRunnerOwnsTask(taskData, uid);

    // Verify task is in_progress
    assertTaskStatus(taskData, ["in_progress"]);

    const now = nowTimestamp();

    // Update task to completed and disable real-time features
    await taskRef.update({
      status: "completed",
      completedAt: now,
      locationTrackingEnabled: false,
      chatStatus: "read_only", // Lock chat
      callsEnabled: false, // Disable calls
      updatedAt: now,
    });

    // Fetch updated task
    const updatedDoc = await taskRef.get();

    const data = { id: updatedDoc.id, ...updatedDoc.data() };
    await enrichTaskWithCustomerName(data);
    return res.status(200).json({
      success: true,
      message: "Task completed successfully",
      data,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to complete task",
    });
  }
};

/**
 * GET /api/v1/runner/tasks/available
 * Get available tasks for runner (status = created/pending)
 */
const getAvailableTasks = async (req, res) => {
  try {
    const { uid } = req.user;

    // Query tasks with status created/pending/active (not assigned or rejected by this runner)
    const snapshot = await db
      .collection("tasks")
      .where("status", "in", ["pending", "created", "active"])
      .orderBy("createdAt", "desc")
      .get();

    const tasks = [];
    for (const doc of snapshot.docs) {
      const taskData = doc.data();
      const rejections = taskData.runnerRejections || [];

      // Filter out tasks rejected by this runner or already assigned
      if (!rejections.includes(uid) && (!taskData.runnerId || taskData.runnerId === uid)) {
        const task = { id: doc.id, ...taskData };
        await enrichTaskWithCustomerName(task);
        tasks.push(task);
      }
    }

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching available tasks:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch available tasks",
    });
  }
};

/**
 * GET /api/v1/runner/tasks/active
 * Get runner's active task (accepted or in_progress)
 */
const getActiveTask = async (req, res) => {
  try {
    const { uid } = req.user;

    const snapshot = await db
      .collection("tasks")
      .where("runnerId", "==", uid)
      .where("status", "in", ["accepted", "in_progress"])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: null,
        message: "No active task found",
      });
    }

    const taskDoc = snapshot.docs[0];
    const data = { id: taskDoc.id, ...taskDoc.data() };
    await enrichTaskWithCustomerName(data);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching active task:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch active task",
    });
  }
};

/**
 * GET /api/v1/runner/tasks/{taskId}
 * Get task details (runner view)
 */
const getTaskById = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskDoc, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task or task is available
    if (taskData.runnerId && taskData.runnerId !== uid) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this task",
      });
    }

    const data = { id: taskDoc.id, ...taskData };
    await enrichTaskWithCustomerName(data);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch task",
    });
  }
};

/**
 * POST /api/v1/tasks/{taskId}/location/start
 * Start location tracking for a task
 */
const startLocationTracking = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task
    assertRunnerOwnsTask(taskData, uid);

    // Verify task is in a state that allows location tracking
    if (!canTrackLocation(taskData)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Location tracking can only be started for accepted or in_progress tasks",
      });
    }

    const now = nowTimestamp();

    // Enable location tracking
    await taskRef.update({
      locationTrackingEnabled: true,
      updatedAt: now,
    });

    return res.status(200).json({
      success: true,
      message: "Location tracking started",
    });
  } catch (error) {
    console.error("Error starting location tracking:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to start location tracking",
    });
  }
};

/**
 * POST /api/v1/tasks/{taskId}/location/update
 * Update runner's current location
 */
const sendLocationUpdate = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;
    const { lat, lng, accuracy } = req.body;

    // Validate input
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        error: "Bad Request",
        message: "lat and lng are required and must be numbers",
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid latitude or longitude values",
      });
    }

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task
    assertRunnerOwnsTask(taskData, uid);

    // Verify task is in_progress and location tracking is enabled
    const status = normalizeStatus(taskData.status);
    if (status !== "in_progress") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Location updates can only be sent for in_progress tasks",
      });
    }

    if (!taskData.locationTrackingEnabled) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Location tracking is not enabled for this task",
      });
    }

    // Throttle check
    const lastLocation = taskData.runnerCurrentLocation;
    const throttleCheck = shouldThrottleLocationUpdate(lastLocation, lat, lng);

    if (throttleCheck.shouldThrottle) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: throttleCheck.reason || "Location update throttled",
      });
    }

    const now = nowTimestamp();
    const nowMillis = now.toMillis();

    // Update runnerCurrentLocation on task document
    const updateData = {
      runnerCurrentLocation: {
        lat,
        lng,
        updatedAt: nowMillis,
      },
      updatedAt: now,
    };

    // Optionally write to location_updates subcollection for history
    const locationUpdateRef = taskRef.collection("location_updates").doc();
    const locationUpdateData = {
      lat,
      lng,
      timestamp: nowMillis,
    };

    // Use batch write for atomicity
    const batch = db.batch();
    batch.update(taskRef, updateData);
    batch.set(locationUpdateRef, locationUpdateData);

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        lat,
        lng,
        updatedAt: nowMillis,
      },
    });
  } catch (error) {
    console.error("Error updating location:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update location",
    });
  }
};

/**
 * POST /api/v1/tasks/{taskId}/location/stop
 * Stop location tracking for a task
 */
const stopLocationTracking = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify runner owns the task
    assertRunnerOwnsTask(taskData, uid);

    // Don't allow stopping if task is already completed/cancelled
    const status = normalizeStatus(taskData.status);
    if (status === "completed" || status === "cancelled") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot stop location tracking for completed or cancelled tasks",
      });
    }

    const now = nowTimestamp();

    // Disable location tracking
    await taskRef.update({
      locationTrackingEnabled: false,
      updatedAt: now,
    });

    return res.status(200).json({
      success: true,
      message: "Location tracking stopped",
    });
  } catch (error) {
    console.error("Error stopping location tracking:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to stop location tracking",
    });
  }
};

/**
 * POST /api/v1/runner/status
 * Set runner availability status
 */
const setRunnerStatus = async (req, res) => {
  try {
    const { uid } = req.user;
    const { status } = req.body;

    if (!status || !["online", "offline"].includes(status)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "status must be 'online' or 'offline'",
      });
    }

    // Update user document with runner status
    const userRef = db.collection("users").doc(uid);
    await userRef.update({
      runnerStatus: status,
      updatedAt: nowTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: `Runner status set to ${status}`,
      data: { status },
    });
  } catch (error) {
    console.error("Error setting runner status:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to set runner status",
    });
  }
};

module.exports = {
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
};
