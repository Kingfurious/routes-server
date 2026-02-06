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
   - **customer_token**: Firebase ID token for customer user (PRIMARY - used for customer endpoints)
   - **runner_token**: Firebase ID token for runner user (used for runner endpoints)
   - **taskId**: Task ID for testing (set after creating a task)
   - **callId**: Call ID for testing (set after initiating a call)
   - **firebase_token**: Legacy variable (kept for backward compatibility, uses customer_token if not set)

**Important**: You need **TWO separate Firebase users** - one as customer and one as runner. Get ID tokens for both users and set them in the environment variables.

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

# Get Customer Token
node scripts/get-id-token.js <CUSTOMER_UID> <API_KEY>

# Get Runner Token
node scripts/get-id-token.js <RUNNER_UID> <API_KEY>

# Example:
node scripts/get-id-token.js 4SWw8OYOT5Nz9Dxl9mQoGt5MV973 YOUR_API_KEY
```

This will output the ID token that you can directly copy to Postman.

**You need to run this twice** - once for your customer user UID and once for your runner user UID.

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

### 📋 Task Management Endpoints (Sprint 2)
- **GET /api/v1/tasks/metadata** - Get task metadata (public)
- **POST /api/v1/tasks** - Create a new task
- **GET /api/v1/tasks/my** - Get all tasks for authenticated customer
- **GET /api/v1/tasks/:taskId** - Get task by ID
- **PUT /api/v1/tasks/:taskId** - Update task
- **DELETE /api/v1/tasks/:taskId** - Delete/cancel task

### 🏃 Runner Task Management Endpoints (Sprint 3)
- **POST /api/v1/runner/tasks/:taskId/accept** - Accept a task
- **POST /api/v1/runner/tasks/:taskId/reject** - Reject a task
- **POST /api/v1/runner/tasks/:taskId/start** - Start a task
- **POST /api/v1/runner/tasks/:taskId/complete** - Complete a task
- **GET /api/v1/runner/tasks/available** - Get available tasks
- **GET /api/v1/runner/tasks/active** - Get runner's active task
- **GET /api/v1/runner/tasks/:taskId** - Get task details (runner view)
- **POST /api/v1/runner/tasks/status** - Set runner availability

### 📍 Location Tracking Endpoints (Sprint 3)
- **POST /api/v1/runner/tasks/:taskId/location/start** - Start location tracking
- **POST /api/v1/runner/tasks/:taskId/location/update** - Update runner location
- **POST /api/v1/runner/tasks/:taskId/location/stop** - Stop location tracking

### 💬 Task Messaging Endpoints (Sprint 3)
- **POST /api/v1/tasks/:taskId/messages** - Send message (text or image)

### 📞 Task Calls Endpoints (Sprint 3)
- **POST /api/v1/tasks/:taskId/call/initiate** - Initiate a call
- **POST /api/v1/tasks/:taskId/call/token** - Get token to join call
- **POST /api/v1/tasks/:taskId/call/end** - End a call

## Testing Workflow

### 1. Test Public Endpoints First
Start with Terms endpoints (no auth required):
- `GET /api/v1/terms/active`
- `GET /api/v1/terms/terms`
- `GET /api/v1/terms/privacy`

### 2. Authenticate
1. **Get Customer Token**: Get Firebase ID token for your customer user
2. **Get Runner Token**: Get Firebase ID token for your runner user (different user account)
3. Set `customer_token` and `runner_token` in environment variables
4. Test `GET /api/v1/auth/validate` with customer_token to verify it works
5. Test `GET /api/v1/auth/validate` with runner_token to verify it works

### 3. Create User Profile
1. Use `POST /api/v1/users/me` with sample data:
   ```json
   {
     "name": "Akhil ",
     "phone": "+911234567890",
     "authProvider": "email"
   }
   ```

### 4. Test Other Endpoints
- Get profile: `GET /api/v1/users/me`
- Update profile: `PUT /api/v1/users/me`
- Get/Update settings: `GET /api/v1/users/me/settings`
- Accept terms: `POST /api/v1/users/me/terms`

### 5. Test Task Management (Sprint 2)
1. Get task metadata: `GET /api/v1/tasks/metadata`
2. Create a task: `POST /api/v1/tasks` (copy the task ID from response)
3. Set `taskId` in environment variables
4. Get your tasks: `GET /api/v1/tasks/my`
5. Get task by ID: `GET /api/v1/tasks/:taskId`

### 6. Test Runner Workflow (Sprint 3)

**Important**: Make sure you're using the correct token for each role:
- Customer endpoints automatically use `customer_token`
- Runner endpoints automatically use `runner_token`

**As Customer (using customer_token):**
1. Create a task: `POST /api/v1/tasks` (copy taskId from response, set in environment)
2. Get your tasks: `GET /api/v1/tasks/my`
3. Send message: `POST /api/v1/tasks/:taskId/messages`
4. Join call: `POST /api/v1/tasks/:taskId/call/token` (use callId from runner's initiate call)

**As Runner (using runner_token):**
1. Get available tasks: `GET /api/v1/runner/tasks/available`
2. Accept a task: `POST /api/v1/runner/tasks/:taskId/accept`
3. Start the task: `POST /api/v1/runner/tasks/:taskId/start`
4. Start location tracking: `POST /api/v1/runner/tasks/:taskId/location/start`
5. Update location: `POST /api/v1/runner/tasks/:taskId/location/update`
6. Send message: `POST /api/v1/tasks/:taskId/messages`
7. Initiate call: `POST /api/v1/tasks/:taskId/call/initiate` (copy callId from response, set in environment)
8. Complete task: `POST /api/v1/runner/tasks/:taskId/complete`

## Sample Request Bodies

### Create User Profile
```json
{
  "name": "Akhil MR",
  "phone": "+911234567890",
  "authProvider": "email"
}
```

### Update User Profile
```json
{
  "name": "Akhil MR",
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

### Create Task
```json
{
  "categoryId": "household_chores",
  "categoryName": "Household Chores",
  "taskTypeId": "fold_laundry",
  "taskName": "Fold Laundry",
  "taskDescription": "Please fold all clean laundry neatly.",
  "location": {
    "address": "123 Corner St., Vancouver, BC",
    "latitude": 49.2827,
    "longitude": -123.1207,
    "placeName": "123 Corner St."
  },
  "scheduledDate": 1737129600000,
  "dynamicFields": {
    "noOfLaundryBaskets": 2
  }
}
```

### Send Text Message
```json
{
  "type": "text",
  "text": "Hello! I'm on my way to the location."
}
```

### Send Image Message
```json
{
  "type": "image",
  "mediaUrl": "https://storage.googleapis.com/your-bucket/image.jpg"
}
```

### Update Location
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "accuracy": 15
}
```

### Set Runner Status
```json
{
  "status": "online"
}
```

### Join Call / End Call
```json
{
  "callId": "YOUR_CALL_ID_HERE"
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
- **403 Forbidden** - User doesn't have permission
- **404 Not Found** - Resource not found
- **429 Too Many Requests** - Rate limited (e.g., location updates throttled)
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
4. Paste it in Postman's `customer_token` or `runner_token` environment variable (depending on which role you're testing)
5. **Make sure you have separate tokens for customer and runner** - they should be from different user accounts

### Other 401 Issues
- Check if `customer_token` or `runner_token` is set correctly (depending on endpoint)
- Verify token hasn't expired (ID tokens expire after 1 hour)
- Ensure token format: `Bearer <token>` (the "Bearer " prefix is added automatically)
- Make sure you copied the entire token (no truncation)
- **For runner endpoints**: Make sure you're using `runner_token`, not `customer_token`
- **For customer endpoints**: Make sure you're using `customer_token`

### 404 Not Found
- Verify `base_url` is correct
- Check if server is running on the specified port
- Ensure endpoint path is correct

### Connection Refused
- Make sure backend server is running: `npm start` or `npm run dev`
- Check if port matches environment variable (default: 8080)

### 400 Bad Request - Task Status Errors
- Ensure task is in correct status for the operation
- Task lifecycle: `created/pending` → `accepted` → `in_progress` → `completed`
- Location updates only work when task is `in_progress` and `locationTrackingEnabled` is true
- Messages only work when task is `accepted` or `in_progress` and `chatStatus` is `active`
- Calls only work when task is `accepted` or `in_progress`

### 429 Too Many Requests - Location Throttling
- Location updates are throttled to minimum 20 seconds or 30 meters movement
- Wait at least 20 seconds between location updates, or move at least 30 meters

### Agora Call Errors
- Ensure `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` environment variables are set on the server
- Calls require Agora account setup - see README.md for configuration details

## Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)
