const admin = require("firebase-admin");
const db = admin.firestore();
const {
  loadTask,
  assertUserBelongsToTask,
  nowTimestamp,
  canSendMessages,
} = require("./helpers/taskAccess");

/**
 * POST /api/v1/tasks/{taskId}/messages
 * Send a message (text or image) in a task chat
 * Shared by both customer and runner
 */
const sendMessage = async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;
    const { type, text, mediaUrl } = req.body;

    // Validate message type
    if (!type || !["text", "image"].includes(type)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "type must be 'text' or 'image'",
      });
    }

    // Load task and verify access
    const { taskRef, data: taskData } = await loadTask(taskId);

    // Verify user belongs to task (either customer or runner)
    assertUserBelongsToTask(taskData, uid);

    // Check if chat is active
    const chatStatus = taskData.chatStatus || "inactive";
    if (chatStatus === "read_only" || chatStatus === "inactive") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Chat is read-only. Messages cannot be sent for completed or cancelled tasks.",
      });
    }

    // Verify task status allows messaging
    if (!canSendMessages(taskData)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Messages can only be sent for accepted or in_progress tasks",
      });
    }

    // Validate message content based on type
    if (type === "text") {
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "text is required for text messages",
        });
      }
      if (mediaUrl) {
        return res.status(400).json({
          error: "Bad Request",
          message: "mediaUrl should not be provided for text messages",
        });
      }
    } else if (type === "image") {
      if (!mediaUrl || typeof mediaUrl !== "string") {
        return res.status(400).json({
          error: "Bad Request",
          message: "mediaUrl is required for image messages",
        });
      }
      // Basic URL validation
      try {
        new URL(mediaUrl);
      } catch (e) {
        return res.status(400).json({
          error: "Bad Request",
          message: "mediaUrl must be a valid URL",
        });
      }
    }

    // Determine sender role
    const senderRole = taskData.customerId === uid ? "customer" : "runner";

    const now = nowTimestamp();
    const nowMillis = now.toMillis();

    // Create message document
    const messageRef = taskRef.collection("messages").doc();
    const messageId = messageRef.id;

    const messageData = {
      messageId,
      senderId: uid,
      senderRole,
      type,
      text: type === "text" ? text.trim() : null,
      mediaUrl: type === "image" ? mediaUrl : null,
      sentAt: nowMillis,
    };

    // Update task with last message info (optional, for task list previews)
    const taskUpdate = {
      lastMessageAt: nowMillis,
      lastMessageText: type === "text" ? text.trim().substring(0, 100) : "[Image]",
      lastMessageSenderId: uid,
      updatedAt: now,
    };

    // Use batch write for atomicity
    const batch = db.batch();
    batch.set(messageRef, messageData);
    batch.update(taskRef, taskUpdate);

    await batch.commit();

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        id: messageId,
        ...messageData,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: error.code || "Error",
        message: error.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to send message",
    });
  }
};

module.exports = {
  sendMessage,
};
