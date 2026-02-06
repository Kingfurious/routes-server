const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Helper to safely get current Firestore Timestamp
 */
const nowTimestamp = () => admin.firestore.Timestamp.now();

/**
 * POST /api/v1/tasks
 *
 * Creates a new task document. Accepts dynamicFields from the frontend
 * without interpreting them (they are stored as-is).
 */
const createTask = async (req, res) => {
  try {
    const { uid, email } = req.user;

    const {
      // Core task identity
      categoryId,
      categoryName,
      taskTypeId,
      taskName,
      taskDescription,

      // Location
      location,

      // Schedule
      scheduledDate,
      scheduledTime,
      scheduledDateTime,

      // Dynamic form payload
      dynamicFields,

      // Additional info
      additionalNotes,
      photos,

      // Payment info
      paymentStatus,
      paymentId,
      paymentAmount,
      estimatedCost,
      budget,
    } = req.body;

    // Basic validation of required fields for Sprint 1
    if (!categoryId || !taskTypeId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "categoryId and taskTypeId are required",
      });
    }

    if (!location || typeof location !== "object") {
      return res.status(400).json({
        error: "Bad Request",
        message: "location is required and must be an object",
      });
    }

    if (!scheduledDate && !scheduledDateTime) {
      return res.status(400).json({
        error: "Bad Request",
        message:
          "scheduledDate or scheduledDateTime is required to schedule the task",
      });
    }

    if (!dynamicFields || typeof dynamicFields !== "object") {
      return res.status(400).json({
        error: "Bad Request",
        message: "dynamicFields is required and must be an object",
      });
    }

    // Generate task document reference (auto ID)
    const taskRef = db.collection("tasks").doc();
    const taskId = taskRef.id;

    // Very simple human-readable task number (can be improved later)
    const createdAtTs = nowTimestamp();
    const createdAtMillis = createdAtTs.toMillis();
    const taskNumber = `TASK-${createdAtMillis}`;

    const taskData = {
      // Identifiers
      id: taskId,
      taskNumber,

      // Customer
      customerId: uid,
      customerEmail: email || null,

      // Task details
      categoryId,
      categoryName: categoryName || null,
      taskTypeId,
      taskName: taskName || null,
      taskDescription: taskDescription || null,

      // Location
      location,

      // Schedule
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      scheduledDateTime: scheduledDateTime || null,

      // Dynamic fields from form (no interpretation)
      dynamicFields,

      // Additional info
      additionalNotes: additionalNotes || null,
      photos: Array.isArray(photos) ? photos : [],

      // Payment
      paymentStatus: paymentStatus || "pending",
      paymentId: paymentId || null,
      paymentAmount:
        typeof paymentAmount === "number" ? paymentAmount : null,
      estimatedCost:
        typeof estimatedCost === "number" ? estimatedCost : null,
      budget: typeof budget === "number" ? budget : null,

      // Task lifecycle
      status: "pending", // pending, active, in_progress, completed, cancelled
      runnerId: null,
      runnerName: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,

      // Sprint-3: Real-time collaboration fields
      chatStatus: "inactive", // inactive, active, read_only
      callsEnabled: true, // Enable calls by default (disabled on completion)
      locationTrackingEnabled: false,
      runnerCurrentLocation: null,

      // Timestamps
      createdAt: createdAtTs,
      updatedAt: createdAtTs,
    };

    await taskRef.set(taskData);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: taskData,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create task",
    });
  }
};

/**
 * GET /api/v1/tasks/my
 *
 * Returns all tasks for the authenticated customer.
 */
const getMyTasks = async (req, res) => {
  try {
    const { uid } = req.user;

    const snapshot = await db
      .collection("tasks")
      .where("customerId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user tasks",
    });
  }
};

/**
 * GET /api/v1/tasks/:taskId
 *
 * Returns a single task by ID. Only the task owner can view their task.
 */
const getTaskById = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const taskDoc = await db.collection("tasks").doc(taskId).get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();

    // Authorization: only task owner can view
    if (taskData.customerId !== uid) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this task",
      });
    }

    return res.json({
      success: true,
      data: {
        id: taskDoc.id,
        ...taskData,
      },
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch task",
    });
  }
};

/**
 * PUT /api/v1/tasks/:taskId
 *
 * Updates a task. Only the task owner can update, and only certain fields
 * are allowed. Cannot update completed or cancelled tasks.
 */
const updateTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;
    const updateData = req.body;

    const taskRef = db.collection("tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();

    // Authorization: only task owner can update
    if (taskData.customerId !== uid) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this task",
      });
    }

    // Business rule: cannot update completed or cancelled tasks
    if (taskData.status === "completed" || taskData.status === "cancelled") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot update a completed or cancelled task",
      });
    }

    // Define allowed fields for update
    const allowedFields = [
      "location",
      "scheduledDate",
      "scheduledTime",
      "scheduledDateTime",
      "dynamicFields",
      "additionalNotes",
      "photos",
      "taskDescription",
      "paymentAmount",
      "estimatedCost",
      "budget",
      "categoryName",
      "taskName",
    ];

    const updatePayload = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        updatePayload[key] = updateData[key];
      }
    });

    // Always update updatedAt timestamp
    updatePayload.updatedAt = nowTimestamp();

    await taskRef.update(updatePayload);

    // Fetch updated document
    const updatedDoc = await taskRef.get();

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update task",
    });
  }
};

/**
 * DELETE /api/v1/tasks/:taskId
 *
 * Soft deletes a task by setting status to "cancelled".
 * Only the task owner can delete, and cannot delete completed tasks.
 */
const deleteTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const taskRef = db.collection("tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();

    // Authorization: only task owner can delete
    if (taskData.customerId !== uid) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this task",
      });
    }

    // Business rule: cannot delete if task is already completed
    if (taskData.status === "completed") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot delete a completed task",
      });
    }

    // Soft delete: set status to cancelled
    await taskRef.update({
      status: "cancelled",
      updatedAt: nowTimestamp(),
    });

    // Fetch updated document
    const updatedDoc = await taskRef.get();

    return res.json({
      success: true,
      message: "Task cancelled successfully",
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete task",
    });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
};

