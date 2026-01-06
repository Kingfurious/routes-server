const express = require("express");
const router = express.Router();
const { getActiveTerms, getTermsByType } = require("../controllers/termsController");

// Terms routes are public (no authentication required)
router.get("/active", getActiveTerms);
router.get("/:type", getTermsByType);

module.exports = router;
