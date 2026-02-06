/**
 * Agora RTC Token Generation Service
 * 
 * This service generates Agora RTC tokens for real-time communication.
 * Tokens are generated on-demand and never stored in Firestore.
 * 
 * Requires: agora-access-token package
 * Install: npm install agora-access-token
 */

let RtcTokenBuilder = null;
let RtcRole = null;

// Lazy load the agora-access-token package
const loadAgoraSDK = () => {
  if (!RtcTokenBuilder) {
    try {
      const agoraAccessToken = require("agora-access-token");
      RtcTokenBuilder = agoraAccessToken.RtcTokenBuilder;
      RtcRole = agoraAccessToken.RtcRole;
    } catch (error) {
      console.error("agora-access-token package not found. Install it with: npm install agora-access-token");
      throw new Error("Agora SDK not available");
    }
  }
  return { RtcTokenBuilder, RtcRole };
};

/**
 * Generate Agora RTC token for a user joining a channel
 * @param {Object} params - Token generation parameters
 * @param {string} params.appId - Agora App ID (from environment)
 * @param {string} params.appCertificate - Agora App Certificate (from environment)
 * @param {string} params.channelName - Channel name (e.g., task_123_call)
 * @param {string|number} params.uid - User ID (0 for auto-generated)
 * @param {string} params.role - User role: "publisher" or "subscriber" (default: "publisher")
 * @param {number} params.expirationTimeInSeconds - Token expiration in seconds (default: 3600 = 1 hour)
 * @returns {Object} { token: string, expiresAt: number }
 */
const generateRtcToken = ({
  appId,
  appCertificate,
  channelName,
  uid = 0,
  role = "publisher",
  expirationTimeInSeconds = 3600,
}) => {
  if (!appId || !appCertificate) {
    throw new Error("Agora App ID and App Certificate are required");
  }

  if (!channelName) {
    throw new Error("Channel name is required");
  }

  const { RtcTokenBuilder, RtcRole } = loadAgoraSDK();

  // Convert role string to RtcRole enum
  const rtcRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  // Calculate expiration timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Generate token
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    privilegeExpiredTs
  );

  const expiresAt = privilegeExpiredTs * 1000; // Convert to milliseconds

  return {
    token,
    expiresAt,
    channelName,
    uid,
  };
};

/**
 * Get Agora configuration from environment variables
 * @returns {Object} { appId, appCertificate }
 */
const getAgoraConfig = () => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    console.warn(
      "Agora configuration missing. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables."
    );
  }

  return { appId, appCertificate };
};

module.exports = {
  generateRtcToken,
  getAgoraConfig,
};
