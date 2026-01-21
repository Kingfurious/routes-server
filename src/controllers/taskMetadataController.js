const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Helper function to convert Firestore Timestamp to milliseconds
 */
const convertTimestamp = (value) => {
  if (value && value.toMillis) {
    return value.toMillis();
  }
  if (value && value._seconds) {
    return value._seconds * 1000 + (value._nanoseconds || 0) / 1000000;
  }
  return value;
};

/**
 * Helper function to clean document data
 * - Removes duplicate/spaced field names
 * - Trims whitespace and newlines from IDs and string values
 * - Normalizes field names
 */
const cleanDocumentData = (docId, data) => {
  const cleaned = {
    id: docId.trim(), // Clean the document ID
  };

  // Copy fields, excluding any with trailing spaces in keys
  Object.keys(data).forEach((key) => {
    const cleanKey = key.trim();
    if (cleanKey && cleanKey !== "id") {
      // Don't duplicate id field
      let value = data[key];

      // Convert Firestore Timestamps to milliseconds
      if (value && (value.toMillis || value._seconds)) {
        value = convertTimestamp(value);
      }
      // Trim string values
      else if (typeof value === "string") {
        value = value.trim();
      }

      cleaned[cleanKey] = value;
    }
  });

  return cleaned;
};

/**
 * GET /api/v1/tasks/metadata
 *
 * Returns the single bundled JSON cache object used by the Flutter app
 * to render the entire "Create Task" experience.
 *
 * Shape (from Cache in the errunds applications.pdf):
 * {
 *   version: "2026.01",
 *   lastUpdatedAt: 1737129600000,
 *   categories: [...],
 *   taskTypes: [...],
 *   fieldConfigs: [...]
 * }
 */
const getCreateTaskMetadata = async (req, res) => {
  try {
    // Fetch metadata version (singleton doc)
    const metaDocRef = db.collection("task_metadata_meta").doc("current");
    const metaDoc = await metaDocRef.get();

    let version = "2026.01";
    let lastUpdatedAt = Date.now();

    if (metaDoc.exists) {
      const metaData = metaDoc.data();
      if (metaData.version) version = metaData.version;
      if (metaData.lastUpdatedAt) {
        lastUpdatedAt = convertTimestamp(metaData.lastUpdatedAt);
      }
    }

    // Fetch active categories
    const categoriesSnapshot = await db
      .collection("task_categories")
      .where("isActive", "==", true)
      .orderBy("displayOrder")
      .get();

    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push(cleanDocumentData(doc.id, doc.data()));
    });

    // Fetch all task types (don't filter by isActive in query)
    // Filter in-memory: only exclude if explicitly isActive === false
    const taskTypesSnapshot = await db.collection("task_types").get();

    const taskTypes = [];
    const activeTaskTypeIds = new Set();
    taskTypesSnapshot.forEach((doc) => {
      const data = doc.data();
      // Only exclude if explicitly isActive === false
      if (data.isActive === false) {
        return;
      }
      const cleaned = cleanDocumentData(doc.id, data);
      taskTypes.push(cleaned);
      activeTaskTypeIds.add(cleaned.id);
    });

    // Fetch all field configs
    // If we have active task types, filter by them; otherwise include all
    const fieldConfigsSnapshot = await db.collection("task_type_fields").get();

    const fieldConfigs = [];
    fieldConfigsSnapshot.forEach((doc) => {
      const data = doc.data();

      // If we have active task types, filter by them; otherwise include all
      if (activeTaskTypeIds.size > 0 && data.taskTypeId) {
        if (!activeTaskTypeIds.has(data.taskTypeId)) {
          return; // Skip configs for inactive task types
        }
      }

      fieldConfigs.push(cleanDocumentData(doc.id, data));
    });

    // Logging for debugging
    console.log(`Fetched ${categories.length} categories`);
    console.log(`Fetched ${taskTypes.length} task types`);
    console.log(`Fetched ${fieldConfigs.length} field configs`);

    if (taskTypes.length === 0) {
      console.warn(
        "Warning: No task types found. Check if task_types collection has documents."
      );
    }
    if (fieldConfigs.length === 0) {
      console.warn(
        "Warning: No field configs found. Check if task_type_fields collection has documents."
      );
    }

    const response = {
      version,
      lastUpdatedAt,
      categories,
      taskTypes,
      fieldConfigs,
    };

    // Optional HTTP caching hint (short-lived)
    res.set("Cache-Control", "public, max-age=60");

    return res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching create task metadata:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch create task metadata",
    });
  }
};

module.exports = {
  getCreateTaskMetadata,
};

