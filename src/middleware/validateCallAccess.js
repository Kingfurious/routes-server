/**
 * Validate Call Access Middleware
 * 
 * Ensures the authenticated user is either the caller or receiver of the call.
 * Fetches call document from Firestore and validates ownership.
 * 
 * Usage:
 * router.post('/call/token', authenticateToken, validateCallAccess, controller);
 */

const admin = require("firebase-admin");

const validateCallAccess = async (req, res, next) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "callId is required in request body",
      });
    }

    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Fetch call document from Firestore
    const db = admin.firestore();
    const callDoc = await db.collection("calls").doc(callId).get();

    if (!callDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call not found",
      });
    }

    const callData = callDoc.data();

    // Verify user is either caller or receiver
    const isAuthorized =
      req.user.uid === callData.callerId ||
      req.user.uid === callData.receiverId;

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to access this call",
      });
    }

    // Attach call data to request for downstream middleware/controllers
    req.call = {
      id: callId,
      ...callData,
    };

    next();
  } catch (error) {
    console.error("Error validating call access:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to validate call access",
    });
  }
};

module.exports = { validateCallAccess };
