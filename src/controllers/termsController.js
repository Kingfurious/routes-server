const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Get active Terms & Privacy (public endpoint)
 */
const getActiveTerms = async (req, res) => {
  try {
    const termsSnapshot = await db
      .collection("terms_versions")
      .where("isActive", "==", true)
      .get();

    if (termsSnapshot.empty) {
      return res.status(404).json({
        error: "Not Found",
        message: "No active terms found",
      });
    }

    const activeTerms = [];
    termsSnapshot.forEach((doc) => {
      activeTerms.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      data: activeTerms,
    });
  } catch (error) {
    console.error("Error fetching active terms:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch active terms",
    });
  }
};

/**
 * Get latest terms by type (terms or privacy)
 */
const getTermsByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (type !== "terms" && type !== "privacy") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Type must be either 'terms' or 'privacy'",
      });
    }

    // Get latest active document by type
    const termsSnapshot = await db
      .collection("terms_versions")
      .where("type", "==", type)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (termsSnapshot.empty) {
      return res.status(404).json({
        error: "Not Found",
        message: `No active ${type} found`,
      });
    }

    const doc = termsSnapshot.docs[0];
    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type}:`, error);
    res.status(500).json({
      error: "Internal Server Error",
      message: `Failed to fetch ${req.params.type}`,
    });
  }
};

module.exports = {
  getActiveTerms,
  getTermsByType,
};
