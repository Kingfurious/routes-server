/**
 * Validate token and return user info
 * This endpoint uses the auth middleware, so req.user is already populated
 */
const validateToken = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        uid: req.user.uid,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to validate token",
    });
  }
};

module.exports = {
  validateToken,
};
