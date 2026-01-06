const admin = require("firebase-admin");

/**
 * Authentication middleware to verify Firebase ID tokens
 * Extracts token from Authorization header and verifies it with Firebase Admin SDK
 * Attaches decoded user info to req.user for downstream routes
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing authentication token",
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
};

module.exports = { authenticateToken };
