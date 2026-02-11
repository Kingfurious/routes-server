require("dotenv").config();
const { generateRtcToken } = require("../src/controllers/helpers/agoraService");

console.log("Testing Agora Token Generation...");

const appId = process.env.AGORA_APP_ID || "test_app_id";
const appCertificate = process.env.AGORA_APP_CERTIFICATE || "test_app_certificate";
const channelName = "test_channel";
const uid = 12345;

try {
    const result = generateRtcToken({
        appId,
        appCertificate,
        channelName,
        uid,
        role: "publisher",
        expirationTimeInSeconds: 3600,
    });

    console.log("Token generated successfully:", result);
} catch (error) {
    console.error("Error generating token:", error.message);
}
