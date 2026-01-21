const admin = require("firebase-admin");
const db = admin.firestore();

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
      if (metaData.lastUpdatedAt) lastUpdatedAt = metaData.lastUpdatedAt;
    }

    // Fetch active categories
    const categoriesSnapshot = await db
      .collection("task_categories")
      .where("isActive", "==", true)
      .orderBy("displayOrder")
      .get();

    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Fetch active task types
    const taskTypesSnapshot = await db
      .collection("task_types")
      .where("isActive", "==", true)
      .get();

    const taskTypes = [];
    const activeTaskTypeIds = new Set();
    taskTypesSnapshot.forEach((doc) => {
      const data = doc.data();
      taskTypes.push({
        id: doc.id,
        ...data,
      });
      activeTaskTypeIds.add(doc.id);
    });

    // Fetch field configs (optionally filter by active task types)
    const fieldConfigsSnapshot = await db.collection("task_type_fields").get();

    const fieldConfigs = [];
    fieldConfigsSnapshot.forEach((doc) => {
      const data = doc.data();

      // If taskTypeId is present, keep only configs for active task types
      if (data.taskTypeId && !activeTaskTypeIds.has(data.taskTypeId)) {
        return;
      }

      fieldConfigs.push({
        id: doc.id,
        ...data,
      });
    });

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

