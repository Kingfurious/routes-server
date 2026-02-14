/**
 * FCM (Firebase Cloud Messaging) Service
 * 
 * Handles sending push notifications for incoming calls.
 * This is used by both the backend endpoints and Firebase Cloud Functions.
 */

const admin = require("firebase-admin");

/**
 * Send FCM push notification for incoming call
 * @param {string} recipientUid - UID of the user receiving the notification
 * @param {Object} payload - Notification payload
 * @param {string} payload.callId - Call ID
 * @param {string} payload.taskId - Task ID
 * @param {string} payload.callerId - Caller's user ID
 * @param {string} payload.callerName - Caller's display name (optional)
 * @returns {Promise<string>} Message ID if successful
 */
const sendIncomingCallNotification = async (recipientUid, payload) => {
  try {
    // Fetch recipient's FCM token
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(recipientUid).get();

    if (!userDoc.exists) {
      console.error(`User document not found for UID: ${recipientUid}`);
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.warn(
        `FCM token not found for user ${recipientUid}. User may not be registered for push notifications.`
      );
      throw new Error("FCM token not found");
    }

    // Prepare FCM message
    const message = {
      notification: {
        title: "Incoming Call",
        body: payload.callerName
          ? `${payload.callerName} is calling...`
          : "Someone is calling...",
      },
      data: {
        type: "incoming_call",
        callId: payload.callId,
        taskId: payload.taskId,
        callerId: payload.callerId,
      },
      token: fcmToken,
      // Set priority to high for immediate delivery
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "incoming_calls",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
            "content-available": 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: "/path/to/icon.png",
          tag: `call_${payload.callId}`,
          requireInteraction: true,
        },
      },
    };

    // Send the message
    const messaging = admin.messaging();
    const messageId = await messaging.send(message);

    console.log(`FCM notification sent to ${recipientUid}. Message ID: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error(`Error sending FCM notification: ${error.message}`, error);
    throw error;
  }
};

/**
 * Send FCM message for call status updates
 * @param {string} recipientUid - UID of the user
 * @param {string} callId - Call ID
 * @param {string} status - Call status (e.g., 'connecting', 'connected', 'ended')
 * @returns {Promise<string>} Message ID if successful
 */
const sendCallStatusUpdate = async (recipientUid, callId, status) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(recipientUid).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const fcmToken = userDoc.data().fcmToken;

    if (!fcmToken) {
      console.warn(`FCM token not found for user ${recipientUid}`);
      throw new Error("FCM token not found");
    }

    const message = {
      data: {
        type: "call_status_update",
        callId,
        status,
      },
      token: fcmToken,
      android: {
        priority: "high",
      },
    };

    const messaging = admin.messaging();
    const messageId = await messaging.send(message);

    console.log(
      `Call status update sent to ${recipientUid}. Status: ${status}, Message ID: ${messageId}`
    );
    return messageId;
  } catch (error) {
    console.error(`Error sending call status update: ${error.message}`);
    throw error;
  }
};

/**
 * Validate FCM token by sending a test message (optional)
 * @param {string} fcmToken - FCM token to validate
 * @returns {Promise<boolean>} True if token is valid
 */
const validateFcmToken = async (fcmToken) => {
  try {
    const message = {
      data: {
        type: "token_validation_test",
      },
      token: fcmToken,
    };

    const messaging = admin.messaging();
    await messaging.send(message);

    return true;
  } catch (error) {
    console.error(`FCM token validation failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendIncomingCallNotification,
  sendCallStatusUpdate,
  validateFcmToken,
};
