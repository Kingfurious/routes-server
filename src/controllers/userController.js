const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "User profile not found",
      });
    }

    res.json({
      success: true,
      data: userDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user profile",
    });
  }
};

/**
 * Create user profile (idempotent - only creates if not exists)
 */
const createUserProfile = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { name, phone, authProvider = "email" } = req.body;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    // If user already exists, return existing profile
    if (userDoc.exists) {
      return res.json({
        success: true,
        message: "User profile already exists",
        data: userDoc.data(),
      });
    }

    // Create new user profile
    const now = admin.firestore.Timestamp.now();
    const userData = {
      uid,
      email,
      name: name || "",
      phone: phone || null,
      activeRole: "customer",
      isCustomer: true,
      isRunner: false,
      authProvider,
      isOnboarded: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await userRef.set(userData);

    res.status(201).json({
      success: true,
      message: "User profile created successfully",
      data: userData,
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create user profile",
    });
  }
};

/**
 * Update user profile (only allowed fields: name, phone, updatedAt, lastLoginAt, isOnboarded)
 */
const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, phone, isOnboarded, lastLoginAt } = req.body;

    const allowedFields = {};
    if (name !== undefined) allowedFields.name = name;
    if (phone !== undefined) allowedFields.phone = phone;
    if (isOnboarded !== undefined) allowedFields.isOnboarded = isOnboarded;
    if (lastLoginAt !== undefined) {
      // If lastLoginAt is provided as a timestamp or date, convert it
      allowedFields.lastLoginAt = lastLoginAt instanceof admin.firestore.Timestamp 
        ? lastLoginAt 
        : admin.firestore.Timestamp.fromDate(new Date(lastLoginAt));
    }

    // Always update updatedAt
    allowedFields.updatedAt = admin.firestore.Timestamp.now();

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "User profile not found",
      });
    }

    await userRef.update(allowedFields);

    // Fetch updated document
    const updatedDoc = await userRef.get();

    res.json({
      success: true,
      message: "User profile updated successfully",
      data: updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user profile",
    });
  }
};

/**
 * Mark onboarding as completed
 */
const markOnboardingCompleted = async (req, res) => {
  try {
    const { uid } = req.user;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "User profile not found",
      });
    }

    await userRef.update({
      isOnboarded: true,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const updatedDoc = await userRef.get();

    res.json({
      success: true,
      message: "Onboarding marked as completed",
      data: updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update onboarding status",
    });
  }
};

/**
 * Get user account status
 */
const getUserStatus = async (req, res) => {
  try {
    const { uid } = req.user;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "User profile not found",
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      data: {
        status: userData.status,
        isOnboarded: userData.isOnboarded,
      },
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user status",
    });
  }
};

/**
 * Get user settings
 */
const getUserSettings = async (req, res) => {
  try {
    const { uid } = req.user;

    const settingsDoc = await db.collection("user_settings").doc(uid).get();

    if (!settingsDoc.exists) {
      // Return default settings if document doesn't exist
      return res.json({
        success: true,
        data: {
          stayLoggedIn: true,
          notificationsEnabled: true,
          language: "en",
          theme: "light",
        },
      });
    }

    res.json({
      success: true,
      data: settingsDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user settings",
    });
  }
};

/**
 * Update user settings
 */
const updateUserSettings = async (req, res) => {
  try {
    const { uid } = req.user;
    const { stayLoggedIn, notificationsEnabled, language, theme } = req.body;

    const settingsRef = db.collection("user_settings").doc(uid);
    const settingsDoc = await settingsRef.get();

    const updateData = {};
    if (stayLoggedIn !== undefined) updateData.stayLoggedIn = stayLoggedIn;
    if (notificationsEnabled !== undefined)
      updateData.notificationsEnabled = notificationsEnabled;
    if (language !== undefined) updateData.language = language;
    if (theme !== undefined) updateData.theme = theme;

    if (settingsDoc.exists) {
      await settingsRef.update(updateData);
    } else {
      // Create document with defaults if it doesn't exist
      const defaultSettings = {
        stayLoggedIn: stayLoggedIn !== undefined ? stayLoggedIn : true,
        notificationsEnabled:
          notificationsEnabled !== undefined ? notificationsEnabled : true,
        language: language || "en",
        theme: theme || "light",
      };
      await settingsRef.set(defaultSettings);
    }

    const updatedDoc = await settingsRef.get();

    res.json({
      success: true,
      message: "User settings updated successfully",
      data: updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user settings",
    });
  }
};

/**
 * Get user terms acceptance
 */
const getUserTerms = async (req, res) => {
  try {
    const { uid } = req.user;

    const termsDoc = await db
      .collection("user_terms_acceptance")
      .doc(uid)
      .get();

    if (!termsDoc.exists) {
      return res.json({
        success: true,
        data: null,
        message: "No terms acceptance record found",
      });
    }

    res.json({
      success: true,
      data: termsDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching user terms acceptance:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user terms acceptance",
    });
  }
};

/**
 * Accept latest terms (create acceptance record)
 */
const acceptTerms = async (req, res) => {
  try {
    const { uid } = req.user;
    const { termsVersion, privacyVersion } = req.body;

    if (!termsVersion || !privacyVersion) {
      return res.status(400).json({
        error: "Bad Request",
        message: "termsVersion and privacyVersion are required",
      });
    }

    const acceptanceRef = db.collection("user_terms_acceptance").doc(uid);
    const acceptanceDoc = await acceptanceRef.get();

    // Check if already exists (one-time write only)
    if (acceptanceDoc.exists) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Terms acceptance already recorded",
        data: acceptanceDoc.data(),
      });
    }

    const acceptanceData = {
      termsVersion,
      privacyVersion,
      acceptedAt: admin.firestore.Timestamp.now(),
    };

    await acceptanceRef.set(acceptanceData);

    res.status(201).json({
      success: true,
      message: "Terms accepted successfully",
      data: acceptanceData,
    });
  } catch (error) {
    console.error("Error accepting terms:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to accept terms",
    });
  }
};

module.exports = {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  markOnboardingCompleted,
  getUserStatus,
  getUserSettings,
  updateUserSettings,
  getUserTerms,
  acceptTerms,
};
