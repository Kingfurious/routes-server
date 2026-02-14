/**
 * Call Routes
 * 
 * Routes for managing incoming calls with FCM push notifications.
 * 
 * Endpoints:
 * POST /startCall - Initiate a new call
 * POST /call/token - Get Agora token to join a call
 * POST /endCall - End an active call
 * POST /registerFcm - Register FCM token for push notifications
 * GET /call/:callId - Get call details
 */

const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { rateLimitCalls } = require("../middleware/rateLimiter");
const { validateCallAccess } = require("../middleware/validateCallAccess");
const { validateCallState } = require("../middleware/validateCallState");

const {
  startCall,
  getCallToken,
  endCall,
  registerFcmToken,
  getCallDetails,
} = require("../controllers/callController");

// All routes require authentication
router.use(authenticateToken);

/**
 * Start a new call
 * POST /startCall
 * Rate limited: 5 calls per minute
 * Body: { receiverId, taskId }
 */
router.post("/startCall", rateLimitCalls, startCall);

/**
 * Get Agora token for joining a call
 * POST /call/token
 * Middleware: validateCallAccess, validateCallState
 * Body: { callId }
 */
router.post(
  "/call/token",
  validateCallAccess,
  validateCallState(["ringing", "connecting"]),
  getCallToken
);

/**
 * End a call
 * POST /endCall
 * Body: { callId }
 */
router.post("/endCall", endCall);

/**
 * Register FCM token for push notifications
 * POST /registerFcm
 * Body: { fcmToken }
 */
router.post("/registerFcm", registerFcmToken);

/**
 * Get call details
 * GET /call/:callId
 */
router.get("/call/:callId", getCallDetails);

module.exports = router;
