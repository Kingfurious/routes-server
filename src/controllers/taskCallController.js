const admin = require("firebase-admin");
const db = admin.firestore();
const {
  loadTask,
  assertUserBelongsToTask,
  nowTimestamp,
  canInitiateCalls,
} = require("./helpers/taskAccess");
const { generateRtcToken, getAgoraConfig } = require("./helpers/agoraService");

/**
 * POST /api/v1/tasks/{taskId}/call/initiate
 * Initiate a call for a task (runner or customer can initiate)
 */
const initiateCall = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    // Load task and verify access
    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify user belongs to task
    assertUserBelongsToTask(taskData, uid);

    // Verify task status allows calls
    if (!canInitiateCalls(taskData)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Calls can only be initiated for accepted or in_progress tasks",
      });
    }

    // Check if calls are disabled (e.g., after completion)
    if (taskData.callsEnabled === false) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Calls are disabled for this task",
      });
    }

    // Check for existing active call
    const activeCallsSnapshot = await taskRef
      .collection("calls")
      .where("status", "in", ["ringing", "connected"])
      .limit(1)
      .get();

    if (!activeCallsSnapshot.empty) {
      const existingCall = activeCallsSnapshot.docs[0].data();
      return res.status(400).json({
        error: "Bad Request",
        message: "An active call already exists for this task",
        data: {
          callId: activeCallsSnapshot.docs[0].id,
          status: existingCall.status,
        },
      });
    }

    // Get Agora configuration
    const { appId, appCertificate } = getAgoraConfig();
    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Agora service not configured",
      });
    }

    // Determine initiator role
    const initiatedBy = taskData.customerId === uid ? "customer" : "runner";

    // Generate channel name
    const timestamp = Date.now();
    const channelName = `task_${taskId}_call_${timestamp}`;

    // Generate Agora token for initiator
    let token;
    try {
      const tokenResult = generateRtcToken({
        appId,
        appCertificate,
        channelName,
        uid: uid, // Use Firebase UID as Agora UID (or 0 for auto-generated)
        role: "publisher",
        expirationTimeInSeconds: 3600, // 1 hour
      });
      token = tokenResult.token;
    } catch (error) {
      console.error("Error generating Agora token:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to generate call token",
      });
    }

    const now = nowTimestamp();
    const nowMillis = now.toMillis();

    // Create call document in Firestore
    const callRef = taskRef.collection("calls").doc();
    const callId = callRef.id;

    const callData = {
      callId,
      channelName,
      initiatedBy,
      status: "ringing",
      startedAt: nowMillis,
      endedAt: null,
    };

    await callRef.set(callData);

    return res.status(201).json({
      success: true,
      message: "Call initiated successfully",
      data: {
        callId,
        token,
        channelName,
        role: "caller",
        expiresAt: Date.now() + 3600000, // 1 hour from now
      },
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to initiate call",
    });
  }
};

/**
 * POST /api/v1/tasks/{taskId}/call/end
 * End an active call
 */
const endCall = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "callId is required",
      });
    }

    // Load task and verify access
    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify user belongs to task
    assertUserBelongsToTask(taskData, uid);

    // Load call document
    const callRef = taskRef.collection("calls").doc(callId);
    const callDoc = await callRef.get();

    if (!callDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call not found",
      });
    }

    const callData = callDoc.data();

    // Verify call can be ended (must be ringing or connected)
    if (callData.status !== "ringing" && callData.status !== "connected") {
      return res.status(400).json({
        error: "Bad Request",
        message: `Call cannot be ended. Current status: ${callData.status}`,
      });
    }

    const now = nowTimestamp();
    const nowMillis = now.toMillis();

    // Update call status to ended
    await callRef.update({
      status: "ended",
      endedAt: nowMillis,
    });

    return res.status(200).json({
      success: true,
      message: "Call ended successfully",
      data: {
        callId,
        status: "ended",
        endedAt: nowMillis,
      },
    });
  } catch (error) {
    console.error("Error ending call:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to end call",
    });
  }
};

/**
 * POST /api/v1/tasks/{taskId}/call/token
 * Get Agora token for joining an existing call (for the other party)
 */
const getCallToken = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "callId is required",
      });
    }

    // Load task and verify access
    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify user belongs to task
    assertUserBelongsToTask(taskData, uid);

    // Load call document
    const callRef = taskRef.collection("calls").doc(callId);
    const callDoc = await callRef.get();

    if (!callDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call not found",
      });
    }

    const callData = callDoc.data();

    // Verify call is still active
    if (callData.status !== "ringing" && callData.status !== "connected") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Call is not active",
      });
    }

    // Get Agora configuration
    const { appId, appCertificate } = getAgoraConfig();
    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Agora service not configured",
      });
    }

    // Generate token for joining user
    let token;
    try {
      const tokenResult = generateRtcToken({
        appId,
        appCertificate,
        channelName: callData.channelName,
        uid: uid,
        role: "publisher",
        expirationTimeInSeconds: 3600,
      });
      token = tokenResult.token;
    } catch (error) {
      console.error("Error generating Agora token:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to generate call token",
      });
    }

    // Update call status to connected if it was ringing
    if (callData.status === "ringing") {
      await callRef.update({
        status: "connected",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call token generated successfully",
      data: {
        callId,
        token,
        channelName: callData.channelName,
        role: "callee",
        expiresAt: Date.now() + 3600000,
      },
    });
  } catch (error) {
    console.error("Error getting call token:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to get call token",
    });
  }
};

module.exports = {
  initiateCall,
  endCall,
  getCallToken,
};
