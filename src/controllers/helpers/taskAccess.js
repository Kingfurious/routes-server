const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Helper to safely get current Firestore Timestamp
 */
const nowTimestamp = () => admin.firestore.Timestamp.now();

/**
 * Load a task by ID and return task reference, document, and data
 * Throws error if task doesn't exist (to be caught by caller)
 * @param {string} taskId - The task ID
 * @returns {Promise<{taskRef: Firestore.DocumentReference, taskDoc: Firestore.DocumentSnapshot, data: Object}>}
 */
const loadTask = async (taskId) => {
  const taskRef = db.collection("tasks").doc(taskId);
  const taskDoc = await taskRef.get();

  if (!taskDoc.exists) {
    const error = new Error("Task not found");
    error.status = 404;
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  return {
    taskRef,
    taskDoc,
    data: taskDoc.data(),
  };
};

/**
 * Assert that the user is the customer who owns the task
 * @param {Object} taskData - The task data object
 * @param {string} uid - The user ID to check
 * @throws {Error} If user is not the customer
 */
const assertCustomerOwnsTask = (taskData, uid) => {
  if (taskData.customerId !== uid) {
    const error = new Error("You don't have permission to access this task");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

/**
 * Assert that the user is the runner assigned to the task
 * @param {Object} taskData - The task data object
 * @param {string} uid - The user ID to check
 * @throws {Error} If user is not the runner
 */
const assertRunnerOwnsTask = (taskData, uid) => {
  if (!taskData.runnerId || taskData.runnerId !== uid) {
    const error = new Error("You are not assigned as the runner for this task");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

/**
 * Assert that the user is either the customer or runner of the task
 * @param {Object} taskData - The task data object
 * @param {string} uid - The user ID to check
 * @throws {Error} If user is neither customer nor runner
 */
const assertUserBelongsToTask = (taskData, uid) => {
  if (taskData.customerId !== uid && taskData.runnerId !== uid) {
    const error = new Error("You don't have permission to access this task");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

/**
 * Assert that the task status is one of the allowed statuses
 * Maps legacy statuses to Sprint-3 statuses for compatibility
 * @param {Object} taskData - The task data object
 * @param {string[]} allowedStatuses - Array of allowed status values
 * @throws {Error} If task status is not in allowed list
 */
const assertTaskStatus = (taskData, allowedStatuses) => {
  let currentStatus = taskData.status;

  // Map legacy statuses to Sprint-3 statuses
  if (currentStatus === "pending") {
    currentStatus = "created";
  } else if (currentStatus === "active") {
    currentStatus = "accepted";
  }

  if (!allowedStatuses.includes(currentStatus)) {
    const error = new Error(
      `Task status must be one of: ${allowedStatuses.join(", ")}. Current status: ${currentStatus}`
    );
    error.status = 400;
    error.code = "INVALID_TASK_STATUS";
    throw error;
  }
};

/**
 * Normalize task status to Sprint-3 format
 * @param {string} status - The status to normalize
 * @returns {string} Normalized status
 */
const normalizeStatus = (status) => {
  if (status === "pending") return "created";
  if (status === "active") return "accepted";
  return status;
};

/**
 * Check if task is in a state that allows location tracking
 * @param {Object} taskData - The task data object
 * @returns {boolean}
 */
const canTrackLocation = (taskData) => {
  const status = normalizeStatus(taskData.status);
  return status === "accepted" || status === "in_progress";
};

/**
 * Check if task is in a state that allows messaging
 * @param {Object} taskData - The task data object
 * @returns {boolean}
 */
const canSendMessages = (taskData) => {
  const status = normalizeStatus(taskData.status);
  return status === "accepted" || status === "in_progress";
};

/**
 * Check if task is in a state that allows calls
 * @param {Object} taskData - The task data object
 * @returns {boolean}
 */
const canInitiateCalls = (taskData) => {
  const status = normalizeStatus(taskData.status);
  return status === "accepted" || status === "in_progress" || status === "arrived";
};

/**
 * Enrich task data with customerName from users collection if missing.
 * Used for tasks created before customerName was stored on the task.
 * @param {Object} taskData - The task data object (mutated in place)
 * @returns {Promise<Object>} The same taskData with customerName set if it was missing
 */
const enrichTaskWithCustomerName = async (taskData) => {
  if (taskData.customerName) return taskData;
  const customerId = taskData.customerId;
  if (!customerId) return taskData;
  try {
    const userDoc = await db.collection("users").doc(customerId).get();
    if (userDoc.exists && userDoc.data()?.name) {
      taskData.customerName = userDoc.data().name;
    }
  } catch (err) {
    console.warn("Could not enrich task with customer name:", err.message);
  }
  return taskData;
};

module.exports = {
  nowTimestamp,
  loadTask,
  assertCustomerOwnsTask,
  assertRunnerOwnsTask,
  assertUserBelongsToTask,
  assertTaskStatus,
  normalizeStatus,
  canTrackLocation,
  canSendMessages,
  canInitiateCalls,
  enrichTaskWithCustomerName,
};
