const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  markOnboardingCompleted,
  getUserStatus,
  getUserSettings,
  updateUserSettings,
  getUserTerms,
  acceptTerms,
} = require("../controllers/userController");

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get("/me", getUserProfile);
router.post("/me", createUserProfile);
router.put("/me", updateUserProfile);
router.patch("/me/onboarding", markOnboardingCompleted);
router.get("/me/status", getUserStatus);

// User settings routes
router.get("/me/settings", getUserSettings);
router.put("/me/settings", updateUserSettings);

// User terms acceptance routes
router.get("/me/terms", getUserTerms);
router.post("/me/terms", acceptTerms);

module.exports = router;
