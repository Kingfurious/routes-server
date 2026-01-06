/**
 * Helper script to get ID token directly using Firebase Admin SDK
 * This creates a custom token, then uses Firebase REST API to exchange it for ID token
 * 
 * Usage: node scripts/get-id-token.js <USER_UID> <API_KEY>
 * 
 * You can get API_KEY from Firebase Console > Project Settings > General > Web API Key
 */

const admin = require("firebase-admin");
const https = require("https");

// Initialize Firebase Admin
const serviceAccount = require("../src/services.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const uid = process.argv[2];
const apiKey = process.argv[3];

if (!uid || !apiKey) {
  console.error("❌ Error: Please provide user UID and API key");
  console.log("\nUsage: node scripts/get-id-token.js <USER_UID> <API_KEY>");
  console.log("\nExample: node scripts/get-id-token.js 4SWw8OYOT5Nz9Dxl9mQoGt5MV973 YOUR_API_KEY");
  console.log("\nGet API_KEY from: Firebase Console > Project Settings > General > Web API Key");
  process.exit(1);
}

async function getIdToken() {
  try {
    // Check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (error) {
      console.error(`❌ Error: User with UID "${uid}" not found in Firebase Auth`);
      console.log("\nMake sure the user exists in Firebase Authentication.");
      process.exit(1);
    }

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    console.log("\n🔄 Exchanging custom token for ID token...");
    
    // Exchange custom token for ID token using Firebase REST API
    const exchangeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
    
    const postData = JSON.stringify({
      token: customToken,
      returnSecureToken: true
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(exchangeUrl, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.error) {
              console.error("❌ Error:", response.error.message);
              reject(new Error(response.error.message));
              return;
            }
            
            if (response.idToken) {
              console.log("\n✅ ID Token Generated Successfully!");
              console.log("\n" + "=".repeat(80));
              console.log("ID TOKEN (Use this in Postman Authorization header):");
              console.log("=".repeat(80));
              console.log(response.idToken);
              console.log("=".repeat(80));
              
              console.log("\n📋 User Info:");
              console.log(`   UID: ${userRecord.uid}`);
              console.log(`   Email: ${userRecord.email || 'N/A'}`);
              
              console.log("\n📝 Postman Setup:");
              console.log("1. Copy the ID token above");
              console.log("2. In Postman, go to your environment variables");
              console.log("3. Set 'firebase_token' to the ID token (without 'Bearer ' prefix)");
              console.log("4. The Authorization header will be automatically set");
              
              console.log("\n⏰ Token expires in:", response.expiresIn, "seconds");
              
            } else {
              reject(new Error("No ID token in response"));
            }
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getIdToken().catch(console.error);
