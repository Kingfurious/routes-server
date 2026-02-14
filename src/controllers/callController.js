/**
 * Call Controller
 * 
 * Handles all call-related operations:
 * - Starting new calls (POST /startCall)
 * - Generating Agora tokens (POST /call/token)
 * - Ending calls (POST /endCall)
 * - Registering FCM tokens (POST /registerFcm)
 */

const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const { generateRtcToken, getAgoraConfig } = require("./helpers/agoraService");
const { sendIncomingCallNotification } = require("./helpers/fcmService");

/**
 * Start a new call
 * 
 * POST /startCall
 * Body: { receiverId, taskId }
 * Response: { callId, channelName }
 */
const startCall = async (req, res) => {
  try {
    const { receiverId, taskId } = req.body;
    const callerId = req.user.uid;

    // Validation
    if (!receiverId || !taskId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "receiverId and taskId are required",
      });
    }

    if (callerId === receiverId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot call yourself",
      });
    }

    // Generate call ID and channel name
    const callId = uuidv4();
    const channelName = `call_${callId}`;

    // Create call document in Firestore
    const db = admin.firestore();
    const callData = {
      callId,
      taskId,
      callerId,
      receiverId,
      status: "ringing",
      channelName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("calls").doc(callId).set(callData);
    console.log(`Call created: ${callId}`);

    // Send FCM push notification to receiver
    // This happens asynchronously - don't wait for it
    sendIncomingCallNotification(receiverId, {
      callId,
      taskId,
      callerId,
    }).catch((error) => {
      console.error(`Failed to send FCM notification for call ${callId}:`, error);
      // Don't throw - call is already created in Firestore
    });

    return res.status(201).json({
      success: true,
      data: {
        callId,
        channelName,
        status: "ringing",
      },
    });
  } catch (error) {
    console.error("Error starting call:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to start call",
    });
  }
};

/**
 * Get Agora RTC token for joining a call
 * 
 * POST /call/token
 * Body: { callId }
 * Response: { token, channelName, expiresAt }
 * 
 * Requires: validateCallAccess, validateCallState middleware
 */
const getCallToken = async (req, res) => {
  try {
    // validateCallAccess middleware already validated and populated req.call
    const call = req.call;
    const userId = req.user.uid;

    // Get Agora configuration
    const { appId, appCertificate } = getAgoraConfig();

    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Agora configuration is not set up",
      });
    }

    // Generate Agora token
    const tokenData = generateRtcToken({
      appId,
      appCertificate,
      channelName: call.channelName,
      uid: 0, // Let Agora auto-assign UID
      role: "publisher",
      expirationTimeInSeconds: 3600, // 1 hour
    });

    // Update call status to "connecting"
    const db = admin.firestore();
    await db.collection("calls").doc(call.id).update({
      status: "connecting",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      data: {
        token: tokenData.token,
        channelName: tokenData.channelName,
        expiresAt: tokenData.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error getting call token:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate call token",
    });
  }
};

/**
 * End a call
 * 
 * POST /endCall
 * Body: { callId }
 * Response: { success: true }
 */
const endCall = async (req, res) => {
  try {
    const { callId } = req.body;
    const userId = req.user.uid;

    if (!callId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "callId is required",
      });
    }

    // Fetch call document
    const db = admin.firestore();
    const callDoc = await db.collection("calls").doc(callId).get();

    if (!callDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call not found",
      });
    }

    const callData = callDoc.data();

    // Verify user is authorized
    const isAuthorized =
      userId === callData.callerId || userId === callData.receiverId;

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to end this call",
      });
    }

    // Update call status to "ended"
    await db.collection("calls").doc(callId).update({
      status: "ended",
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      endedBy: userId,
    });

    console.log(`Call ended: ${callId}`);

    return res.status(200).json({
      success: true,
      message: "Call ended successfully",
    });
  } catch (error) {
    console.error("Error ending call:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to end call",
    });
  }
};

/**
 * Register or update FCM token for a user
 * 
 * POST /registerFcm
 * Body: { fcmToken }
 * Response: { success: true }
 * 
 * This should be called whenever the user logs in or the FCM token changes.
 */
const registerFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.uid;

    if (!fcmToken) {
      return res.status(400).json({
        error: "Bad Request",
        message: "fcmToken is required",
      });
    }

    // Validate FCM token format (basic check)
    if (typeof fcmToken !== "string" || fcmToken.length < 50) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid FCM token format",
      });
    }

    // Save FCM token to user document
    const db = admin.firestore();
    await db.collection("users").doc(userId).update({
      fcmToken,
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`FCM token registered for user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: "FCM token registered successfully",
    });
  } catch (error) {
    console.error("Error registering FCM token:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to register FCM token",
    });
  }
};

/**
 * Get call details
 * 
 * GET /call/:callId
 * Response: { callId, taskId, callerId, receiverId, status, channelName, createdAt }
 */
const getCallDetails = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.uid;

    // Fetch call document
    const db = admin.firestore();
    const callDoc = await db.collection("calls").doc(callId).get();

    if (!callDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call not found",
      });
    }

    const callData = callDoc.data();

    // Verify user is authorized
    const isAuthorized =
      userId === callData.callerId || userId === callData.receiverId;

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to access this call",
      });
    }

    return res.status(200).json({
      success: true,
      data: callData,
    });
  } catch (error) {
    console.error("Error fetching call details:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch call details",
    });
  }
};

module.exports = {
  startCall,
  getCallToken,
  endCall,
  registerFcmToken,
  getCallDetails,
};
