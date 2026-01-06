/**
 * Helper script to generate a custom token for testing
 * This custom token can be exchanged for an ID token on the client side
 * 
 * Usage: node scripts/generate-test-token.js <USER_UID>
 * 
 * Note: This generates a CUSTOM token, not an ID token.
 * You need to exchange this custom token for an ID token using Firebase Auth SDK
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("../src/services.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const uid = process.argv[2];

if (!uid) {
  console.error("❌ Error: Please provide a user UID");
  console.log("\nUsage: node scripts/generate-test-token.js <USER_UID>");
  console.log("\nExample: node scripts/generate-test-token.js 4SWw8OYOT5Nz9Dxl9mQoGt5MV973");
  process.exit(1);
}

async function generateCustomToken() {
  try {
    // Check if user exists
    try {
      await admin.auth().getUser(uid);
    } catch (error) {
      console.error(`❌ Error: User with UID "${uid}" not found in Firebase Auth`);
      console.log("\nMake sure the user exists in Firebase Authentication.");
      process.exit(1);
    }

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    console.log("\n✅ Custom Token Generated Successfully!");
    console.log("\n" + "=".repeat(80));
    console.log("CUSTOM TOKEN (Use this in your Flutter app to get ID token):");
    console.log("=".repeat(80));
    console.log(customToken);
    console.log("=".repeat(80));
    
    console.log("\n📱 To get ID Token in Flutter:");
    console.log(`
// In your Flutter app, after signing in with custom token:
final userCredential = await FirebaseAuth.instance.signInWithCustomToken(customToken);
final idToken = await userCredential.user?.getIdToken();
print('ID Token: \$idToken');
    `);
    
    console.log("\n⚠️  IMPORTANT:");
    console.log("- Custom token is NOT the same as ID token");
    console.log("- You need to exchange custom token for ID token using Firebase Auth SDK");
    console.log("- Use the ID token (not custom token) in Postman Authorization header");
    
  } catch (error) {
    console.error("❌ Error generating custom token:", error.message);
    process.exit(1);
  }
}

generateCustomToken();
