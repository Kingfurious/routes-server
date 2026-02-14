/**
 * Firebase Cloud Function - Incoming Call Notification Trigger
 * 
 * This function is triggered when a new call document is created in Firestore.
 * It sends an FCM push notification to the receiver.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. Ensure Firebase CLI is installed: npm install -g firebase-tools
 * 2. Create a `functions/` directory in your project root
 * 3. Copy this file to `functions/index.js`
 * 4. Run: firebase deploy --only functions
 * 
 * FIRESTORE TRIGGER:
 * Resource: projects/{project}/databases/(default)/documents/calls/{callId}
 * Event Type: google.firestore.document.onCreate
 * 
 * REQUIRED PERMISSIONS:
 * - Firebase Cloud Messaging (for sending FCM messages)
 * - Firestore (for reading user documents)
 * - Cloud Logging (for function logs)
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function: Send FCM notification for incoming calls
 * Triggers on: Firestore onCreate event for calls/{callId}
 */
exports.onIncomingCall = functions
  .region("us-central1") // Change region as needed
  .firestore.document("calls/{callId}")
  .onCreate(async (snap, context) => {
    try {
      const callData = snap.data();
      const callId = context.params.callId;

      console.log(`New call created: ${callId}`, callData);

      // Validate call data
      if (!callData.receiverId || !callData.callerId) {
        console.error("Invalid call data: missing receiverId or callerId");
        return;
      }

      // Fetch receiver's user document to get FCM token
      const db = admin.firestore();
      const receiverDoc = await db
        .collection("users")
        .doc(callData.receiverId)
        .get();

      if (!receiverDoc.exists) {
        console.warn(`User document not found for receiverId: ${callData.receiverId}`);
        return;
      }

      const receiverData = receiverDoc.data();
      const fcmToken = receiverData?.fcmToken;

      if (!fcmToken) {
        console.warn(
          `FCM token not found for user ${callData.receiverId}. User may not be registered.`
        );
        return;
      }

      // Fetch caller's name (optional - for display in notification)
      let callerName = "Unknown";
      try {
        const callerDoc = await db
          .collection("users")
          .doc(callData.callerId)
          .get();

        if (callerDoc.exists) {
          const callerData = callerDoc.data();
          callerName = callerData?.displayName || callerData?.name || "Someone";
        }
      } catch (err) {
        console.warn("Failed to fetch caller name:", err);
      }

      // Prepare FCM message
      const message = {
        notification: {
          title: "Incoming Call",
          body: `${callerName} is calling...`,
        },
        data: {
          type: "incoming_call",
          callId: callId,
          taskId: callData.taskId || "",
          callerId: callData.callerId,
          channelName: callData.channelName || "",
          timestamp: new Date().toISOString(),
        },
        token: fcmToken,
        android: {
          priority: "high",
          ttl: 3600, // 1 hour time-to-live
          notification: {
            sound: "default",
            channelId: "incoming_calls",
            priority: "max",
            defaultVibrateTimings: true,
            defaultLightSettings: true,
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
              badge: 1,
              "mutable-content": 1,
            },
          },
        },
        webpush: {
          notification: {
            title: "Incoming Call",
            body: `${callerName} is calling...`,
            icon: "https://example.com/call-icon.png",
            tag: `call_${callId}`,
            requireInteraction: true,
          },
          fcmOptions: {
            link: `https://yourapp.com/call/${callId}`,
          },
        },
      };

      // Send the message via Firebase Cloud Messaging
      const messaging = admin.messaging();
      const messageId = await messaging.send(message);

      console.log(
        `FCM notification sent successfully to ${callData.receiverId}. Message ID: ${messageId}`
      );

      // Optionally: Log the event to a collection for analytics
      await db
        .collection("notification_logs")
        .add({
          callId,
          receiverId: callData.receiverId,
          callerId: callData.callerId,
          fcmMessageId: messageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });

      return { success: true, messageId };
    } catch (error) {
      console.error("Error in onIncomingCall function:", error);

      // Log error to a collection for debugging
      try {
        const db = admin.firestore();
        await db.collection("function_errors").add({
          functionName: "onIncomingCall",
          error: error.message,
          stack: error.stack,
          callId: context.params.callId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      // Don't throw - FCM failures should not break the function entirely
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function: Clean up old ended calls (optional)
 * Runs every day at 2 AM UTC
 * Deletes calls that ended more than 7 days ago
 */
exports.cleanupOldCalls = functions
  .region("us-central1")
  .pubsub.schedule("0 2 * * *")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snapshot = await db
        .collection("calls")
        .where("status", "==", "ended")
        .where("endedAt", "<", sevenDaysAgo)
        .get();

      console.log(`Found ${snapshot.size} old calls to clean up`);

      // Delete in batches
      const batch = db.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;

        // Firestore batch has a limit of 500 operations
        if (count % 500 === 0) {
          batch.commit();
        }
      });

      await batch.commit();
      console.log(`Cleaned up ${count} old call documents`);

      return { success: true, deletedCount: count };
    } catch (error) {
      console.error("Error in cleanupOldCalls function:", error);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function: Expire active calls after 45 seconds
 * Runs every minute
 * Marks calls as "ended" if they're still in "ringing" state
 */
exports.expireInactiveCalls = functions
  .region("us-central1")
  .pubsub.schedule("* * * * *")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const fortyFiveSecondsAgo = new Date();
      fortyFiveSecondsAgo.setSeconds(fortyFiveSecondsAgo.getSeconds() - 45);

      const snapshot = await db
        .collection("calls")
        .where("status", "==", "ringing")
        .where("createdAt", "<", fortyFiveSecondsAgo)
        .get();

      console.log(`Found ${snapshot.size} expired calls to mark as ended`);

      const batch = db.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          status: "ended",
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          expireReason: "no_response_45s",
        });
        count++;

        if (count % 500 === 0) {
          batch.commit();
        }
      });

      await batch.commit();
      console.log(`Expired ${count} inactive calls`);

      return { success: true, expiredCount: count };
    } catch (error) {
      console.error("Error in expireInactiveCalls function:", error);
      return { success: false, error: error.message };
    }
  });
