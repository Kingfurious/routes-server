# Postman Collection Setup Guide

This guide will help you set up and use the Postman collection for testing the Errunds Backend API.

## Files Included

1. **Errunds_Backend_API.postman_collection.json** - Complete API collection with all endpoints
2. **Errunds_Backend_Environment.postman_environment.json** - Environment variables for easy configuration

## Import Instructions

### Step 1: Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Select **Errunds_Backend_API.postman_collection.json**
4. Click **Import**

### Step 2: Import Environment (Optional but Recommended)
1. Click **Import** button again
2. Select **Errunds_Backend_Environment.postman_environment.json**
3. Click **Import**
4. Select the environment from the dropdown (top right) - "Errunds Backend - Local"

### Step 3: Configure Environment Variables

1. Click the **Environments** icon (left sidebar) or use the environment dropdown
2. Select **Errunds Backend - Local**
3. Update the following variables:
   - **base_url**: Your backend URL (default: `http://localhost:8080`)
   - **firebase_token**: Your Firebase ID token (get this from your Flutter app after login)

## Getting Firebase ID Token

### ⚠️ IMPORTANT: UID vs ID Token

**UID is NOT the same as ID Token!**

- **UID**: A short string like `4SWw8OYOT5Nz9Dxl9mQoGt5MV973` (user identifier)
- **ID Token**: A long JWT string like `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` (authentication token)

**You MUST use the ID Token (JWT), not the UID, in Postman!**

### Method 1: Using Helper Script (Easiest for Testing)

I've created helper scripts to generate ID tokens from a UID:

#### Option A: Get ID Token Directly (Recommended)
```bash
# Get your Firebase Web API Key from:
# Firebase Console > Project Settings > General > Web API Key

node scripts/get-id-token.js <USER_UID> <API_KEY>

# Example:
node scripts/get-id-token.js 4SWw8OYOT5Nz9Dxl9mQoGt5MV973 YOUR_API_KEY
```

This will output the ID token that you can directly copy to Postman.

#### Option B: Generate Custom Token (Then exchange in Flutter)
```bash
node scripts/generate-test-token.js <USER_UID>

# Example:
node scripts/generate-test-token.js 4SWw8OYOT5Nz9Dxl9mQoGt5MV973
```

Then use the custom token in your Flutter app to get the ID token.

### Method 2: From Flutter App (Production Method)
```dart
// After successful Firebase authentication
String? idToken = await FirebaseAuth.instance.currentUser?.getIdToken();
print('ID Token: $idToken');
```

Copy the printed ID token to Postman.

### Method 3: Using Firebase Console + Script
1. Go to Firebase Console > Authentication > Users
2. Copy the UID of the user you want to test with
3. Use the helper script: `node scripts/get-id-token.js <UID> <API_KEY>`

## API Endpoints Overview

### 🔐 Auth Endpoints
- **GET /api/v1/auth/validate** - Validate token and return user info

### 👤 User Profile Endpoints (All require authentication)
- **GET /api/v1/users/me** - Get user profile
- **POST /api/v1/users/me** - Create user profile (first login)
- **PUT /api/v1/users/me** - Update user profile
- **PATCH /api/v1/users/me/onboarding** - Mark onboarding completed
- **GET /api/v1/users/me/status** - Get account status

### ⚙️ User Settings Endpoints (All require authentication)
- **GET /api/v1/users/me/settings** - Get user settings
- **PUT /api/v1/users/me/settings** - Update user settings

### 📋 Terms Acceptance Endpoints (All require authentication)
- **GET /api/v1/users/me/terms** - Get accepted terms versions
- **POST /api/v1/users/me/terms** - Accept latest terms

### 📄 Terms & Privacy Endpoints (Public - No authentication)
- **GET /api/v1/terms/active** - Get all active terms
- **GET /api/v1/terms/:type** - Get latest by type (terms/privacy)

## Testing Workflow

### 1. Test Public Endpoints First
Start with Terms endpoints (no auth required):
- `GET /api/v1/terms/active`
- `GET /api/v1/terms/terms`
- `GET /api/v1/terms/privacy`

### 2. Authenticate
1. Get Firebase ID token from your app
2. Set `firebase_token` in environment variables
3. Test `GET /api/v1/auth/validate` to verify token works

### 3. Create User Profile
1. Use `POST /api/v1/users/me` with sample data:
   ```json
   {
     "name": "John Doe",
     "phone": "+911234567890",
     "authProvider": "email"
   }
   ```

### 4. Test Other Endpoints
- Get profile: `GET /api/v1/users/me`
- Update profile: `PUT /api/v1/users/me`
- Get/Update settings: `GET /api/v1/users/me/settings`
- Accept terms: `POST /api/v1/users/me/terms`

## Sample Request Bodies

### Create User Profile
```json
{
  "name": "John Doe",
  "phone": "+911234567890",
  "authProvider": "email"
}
```

### Update User Profile
```json
{
  "name": "John Doe Updated",
  "phone": "+911234567891"
}
```

### Update User Settings
```json
{
  "stayLoggedIn": true,
  "notificationsEnabled": true,
  "language": "en",
  "theme": "dark"
}
```

### Accept Terms
```json
{
  "termsVersion": "v1.0",
  "privacyVersion": "v1.0"
}
```

## Response Format

All endpoints return responses in this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Error description"
}
```

## Common Status Codes

- **200 OK** - Successful GET/PUT/PATCH requests
- **201 Created** - Successful POST requests (create operations)
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Missing or invalid authentication token
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

## Tips

1. **Use Environment Variables**: Always use `{{base_url}}` and `{{firebase_token}}` in requests
2. **Save Responses**: Right-click on responses to save as examples
3. **Create Tests**: Add test scripts to validate responses automatically
4. **Use Collection Runner**: Run multiple requests in sequence for integration testing

## Troubleshooting

### 401 Unauthorized / "Decoding Firebase ID token failed"
**Common Issue: Using UID instead of ID Token**

❌ **WRONG**: Using UID like `4SWw8OYOT5Nz9Dxl9mQoGt5MV973`  
✅ **CORRECT**: Using ID Token like `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`

**Solution:**
1. Make sure you're using the ID Token (long JWT string), not the UID
2. Use the helper script: `node scripts/get-id-token.js <UID> <API_KEY>`
3. Copy the entire ID token (it's very long, usually 800+ characters)
4. Paste it in Postman's `firebase_token` environment variable

### Other 401 Issues
- Check if `firebase_token` is set correctly
- Verify token hasn't expired (ID tokens expire after 1 hour)
- Ensure token format: `Bearer <token>` (the "Bearer " prefix is added automatically)
- Make sure you copied the entire token (no truncation)

### 404 Not Found
- Verify `base_url` is correct
- Check if server is running on the specified port
- Ensure endpoint path is correct

### Connection Refused
- Make sure backend server is running: `npm start` or `npm run dev`
- Check if port matches environment variable (default: 8080)

## Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)
