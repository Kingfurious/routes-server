/**
 * Validate Call State Middleware
 * 
 * Ensures the call is in a valid state for the requested operation.
 * Must be used after validateCallAccess so req.call is already populated.
 * 
 * Usage:
 * router.post('/call/token', 
 *   authenticateToken, 
 *   validateCallAccess, 
 *   validateCallState(['ringing', 'connecting']),
 *   controller
 * );
 */

/**
 * Create a call state validator middleware
 * @param {Array<string>} allowedStates - Array of allowed call states (e.g., ['ringing', 'connecting'])
 * @returns {Function} Express middleware
 */
const validateCallState = (allowedStates = ["ringing", "connecting"]) => {
  return (req, res, next) => {
    try {
      // Ensure validateCallAccess ran first and populated req.call
      if (!req.call) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: "Call data not found. validateCallAccess must run before validateCallState.",
        });
      }

      const currentState = req.call.status;

      // Check if current state is allowed
      if (!allowedStates.includes(currentState)) {
        return res.status(409).json({
          error: "Conflict",
          message: `Call is in "${currentState}" state. Allowed states: ${allowedStates.join(", ")}`,
          currentState,
          allowedStates,
        });
      }

      next();
    } catch (error) {
      console.error("Error validating call state:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to validate call state",
      });
    }
  };
};

module.exports = { validateCallState };
