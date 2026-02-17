const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { computeRoute } = require("../controllers/routeController");

// Proxy endpoint for mobile app to get driving route via backend
// POST /api/v1/route
router.post("/route", authenticateToken, computeRoute);

module.exports = router;

