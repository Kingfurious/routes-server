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

module.exports = {
  createTask,
  getMyTasks,
};

