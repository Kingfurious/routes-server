const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { validateToken } = require("../controllers/authController");

// Auth routes require authentication
router.use(authenticateToken);

router.get("/validate", validateToken);

module.exports = router;
