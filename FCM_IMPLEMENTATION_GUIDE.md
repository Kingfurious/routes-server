# FCM Push-Based Incoming Calls Implementation Guide

This document covers the complete FCM-based incoming call system implementation for the Errunds backend.

## Overview

The system implements a WhatsApp-style incoming call flow:

```
Caller → POST /startCall → Firestore (calls/{callId})
          ↓
Cloud Function (onIncomingCall) triggers
          ↓
FCM pushes notification to Receiver
          ↓
Receiver wakes up app → POST /call/token → Gets Agora token
          ↓
Receiver joins Agora channel
```

## Architecture

### Components

1. **Backend Endpoints** (`src/routes/calls.js`)
   - `POST /startCall` - Initiate call
   - `POST /call/token` - Get Agora token
   - `POST /endCall` - End call
   - `POST /registerFcm` - Register FCM token
   - `GET /call/:callId` - Get call details

2. **Middleware** (`src/middleware/`)
   - `rateLimiter.js` - Rate limiting (5 calls/minute)
   - `validateCallAccess.js` - Verify call ownership
   - `validateCallState.js` - Verify call state

3. **Services** (`src/controllers/helpers/`)
   - `agoraService.js` - Agora token generation
   - `fcmService.js` - FCM push notifications

4. **Cloud Function** (`functions/index.js`)
   - `onIncomingCall` - Triggered on call creation, sends FCM push
   - `cleanupOldCalls` - Optional: Cleanup 7-day-old calls
   - `expireInactiveCalls` - Optional: Expire unanswered calls after 45s

5. **Controller** (`src/controllers/callController.js`)
   - Business logic for all call operations

## Setup Instructions

### 1. Install Dependencies

#### Main Backend Package
```bash
# Install uuid package for generating call IDs
npm install uuid
```

#### Firebase Cloud Functions
```bash
cd functions
npm install
```

### 2. Environment Configuration

Add to `.env` file:
```env
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Firebase (already configured via services.json)
FIREBASE_PROJECT_ID=your_project_id
```

### 3. Firestore Schema Setup

#### Create Collections

**Collection: `calls`**
```firestore
rules/
  {
    "allow read": "request.auth.uid == resource.data.callerId || request.auth.uid == resource.data.receiverId",
    "allow create": "request.auth.uid != null",
    "allow update": "request.auth.uid in [resource.data.callerId, resource.data.receiverId]",
    "allow delete": "false"
  }
```

**Document Structure:**
```json
{
  "callId": "uuid-string",
  "taskId": "task-id-string",
  "callerId": "user-uid-string",
  "receiverId": "user-uid-string",
  "status": "ringing|connecting|connected|ended",
  "channelName": "call_uuid-string",
  "createdAt": "server-timestamp",
  "updatedAt": "server-timestamp (optional)",
  "endedAt": "server-timestamp (optional)",
  "endedBy": "user-uid-string (optional)"
}
```

**Collection: `users`**
Required new field:
```json
{
  "fcmToken": "fcm-token-string",
  "fcmTokenUpdatedAt": "server-timestamp"
}
```

### 4. Deploy Firebase Cloud Function

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy
firebase deploy --only functions

# View logs
firebase functions:log
```

### 5. Configure Firestore Security Rules

Add to `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Calls collection
    match /calls/{callId} {
      allow read: if request.auth.uid == resource.data.callerId || 
                     request.auth.uid == resource.data.receiverId;
      allow create: if request.auth.uid != null;
      allow update: if request.auth.uid == resource.data.callerId || 
                       request.auth.uid == resource.data.receiverId;
      allow delete: if false;
    }

    // Users collection - only write own data
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if request.auth.uid == uid;
    }

    // Notification logs (Cloud Function writes)
    match /notification_logs/{document=**} {
      allow read: if false;
      allow write: if request.auth.uid == null; // Only Cloud Function
    }

    // Function errors (Cloud Function writes)
    match /function_errors/{document=**} {
      allow read: if false;
      allow write: if request.auth.uid == null; // Only Cloud Function
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## API Endpoints

### 1. Register FCM Token

**Endpoint:** `POST /api/v1/calls/registerFcm`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "fcmToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token registered successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid token)
- `401` - Unauthorized
- `500` - Server error

**Notes:**
- Call this after user logs in
- Call again if FCM token changes (e.g., on app reinstall)
- Token is stored in `users/{uid}.fcmToken`

---

### 2. Start Call

**Endpoint:** `POST /api/v1/calls/startCall`

**Authentication:** Required (Bearer token)

**Rate Limit:** 5 calls per minute per user

**Request Body:**
```json
{
  "receiverId": "string (receiver's UID)",
  "taskId": "string (associated task ID)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callId": "uuid-string",
    "channelName": "call_uuid-string",
    "status": "ringing"
  }
}
```

**Status Codes:**
- `201` - Call created
- `400` - Bad request
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Server error

**Backend Flow:**
1. Generate unique `callId` (UUID)
2. Generate `channelName` = `call_{callId}`
3. Create document: `calls/{callId}` with:
   - `callerId` = authenticated user's UID
   - `receiverId` = request body
   - `taskId` = request body
   - `status` = "ringing"
   - `createdAt` = server timestamp
4. **Async (non-blocking):** Send FCM push to receiver via Cloud Function trigger
5. Return `callId` and `channelName` immediately

**Cloud Function Trigger (Firestore onCreate):**
- Triggered when `calls/{callId}` is created
- Fetches receiver's FCM token from `users/{receiverId}`
- Sends FCM message with payload:
  ```json
  {
    "type": "incoming_call",
    "callId": "uuid-string",
    "taskId": "task-id-string",
    "callerId": "caller-uid-string"
  }
  ```
- Logs notification to `notification_logs` collection

---

### 3. Get Agora Token

**Endpoint:** `POST /api/v1/calls/call/token`

**Authentication:** Required (Bearer token)

**Middleware:**
- `validateCallAccess` - Verifies user is caller or receiver
- `validateCallState` - Ensures call status is "ringing" or "connecting"

**Request Body:**
```json
{
  "callId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "agora-rtc-token-string",
    "channelName": "call_uuid-string",
    "expiresAt": "timestamp-milliseconds"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing callId)
- `401` - Unauthorized
- `403` - Forbidden (user not in call)
- `404` - Call not found
- `409` - Conflict (invalid call state)
- `500` - Server error

**Logic:**
1. Validate request body has `callId`
2. Fetch `calls/{callId}` from Firestore
3. Verify `req.user.uid === callData.callerId || callData.receiverId`
4. Check call status is "ringing" or "connecting" (else return 409)
5. Generate Agora RTC token (1 hour expiration)
6. Update `calls/{callId}` status to "connecting"
7. Return token and channel name

---

### 4. End Call

**Endpoint:** `POST /api/v1/calls/endCall`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "callId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing callId)
- `401` - Unauthorized
- `403` - Forbidden (user not in call)
- `404` - Call not found
- `500` - Server error

**Logic:**
1. Fetch `calls/{callId}` from Firestore
2. Verify user is caller or receiver
3. Update status to "ended"
4. Record `endedAt` timestamp and `endedBy` user ID
5. Return success

---

### 5. Get Call Details

**Endpoint:** `GET /api/v1/calls/call/:callId`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "callId": "uuid-string",
    "taskId": "task-id-string",
    "callerId": "caller-uid-string",
    "receiverId": "receiver-uid-string",
    "status": "ringing|connecting|connected|ended",
    "channelName": "call_uuid-string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp (optional)",
    "endedAt": "timestamp (optional)",
    "endedBy": "uid (optional)"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (user not in call)
- `404` - Call not found
- `500` - Server error

---

## Client Implementation

### Receiver (Called Party)

#### 1. Register FCM Token on Login

```javascript
// After firebase.auth().signInWithEmailAndPassword()
const token = await messaging.getToken();
await fetch('https://your-api.com/api/v1/calls/registerFcm', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ fcmToken: token })
});
```

#### 2. Listen for Incoming Call Notification

```javascript
// In your messaging service worker or app
messaging.onMessage((payload) => {
  if (payload.data.type === 'incoming_call') {
    const { callId, taskId, callerId } = payload.data;
    // Show ringing UI
    showIncomingCallScreen(callId, callerId, taskId);
  }
});
```

#### 3. Accept Call and Join Agora Channel

```javascript
async function acceptCall(callId) {
  // Get Agora token
  const response = await fetch('https://your-api.com/api/v1/calls/call/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ callId })
  });

  const { data } = await response.json();
  const { token, channelName } = data;

  // Join Agora channel
  await agoraClient.join(token, channelName, 0);
  startMediaStream();
}
```

#### 4. End Call

```javascript
async function endCall(callId) {
  await fetch('https://your-api.com/api/v1/calls/endCall', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ callId })
  });

  // Leave Agora channel
  await agoraClient.leave();
}
```

### Caller (Calling Party)

#### 1. Initiate Call

```javascript
async function startCall(receiverId, taskId) {
  const response = await fetch('https://your-api.com/api/v1/calls/startCall', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ receiverId, taskId })
  });

  const { data } = await response.json();
  const callId = data.callId;

  // Show ringing UI
  showOutgoingCallScreen(callId, receiverId);

  // Wait for receiver to answer (poll or use real-time listener)
  pollCallStatus(callId);
}
```

#### 2. Poll Call Status (Firestore Listener)

```javascript
function listenToCallStatus(callId) {
  db.collection('calls').doc(callId).onSnapshot((doc) => {
    const status = doc.data().status;

    switch (status) {
      case 'connecting':
        // Receiver is joining, now get token and join
        joinAgoraChannel(callId);
        break;
      case 'ended':
        // Receiver rejected or call ended
        handleCallEnded();
        break;
    }
  });
}
```

#### 3. Join Agora (once receiver joins)

```javascript
async function joinAgoraChannel(callId) {
  const response = await fetch('https://your-api.com/api/v1/calls/call/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ callId })
  });

  const { data } = await response.json();
  const { token, channelName } = data;

  await agoraClient.join(token, channelName, 0);
  startMediaStream();
}
```

---

## Rate Limiting

**Endpoint:** `POST /startCall`

**Limit:** 5 calls per minute per user

**Algorithm:** Token bucket

**Response on limit exceeded:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Max 5 calls per 60 seconds.",
  "retryAfter": 12
}
```

---

## Call State Machine

```
START
  ↓
[Create call] → status = "ringing"
  ↓ (Receiver accepts)
status = "connecting" (when receiver requests token)
  ↓
status = "connected" (optional, when media starts)
  ↓
[Either party ends]
status = "ended"
```

---

## Security Considerations

### Firestore Rules
- Users can only read calls they're part of
- Users can only update their own data
- Cloud Function is the only writer for notifications/logs

### API Security
- All endpoints require Firebase authentication
- `validateCallAccess` middleware ensures user is in the call
- `validateCallState` middleware prevents invalid operations
- Rate limiting prevents abuse

### FCM Security
- Tokens are stored in user documents
- Only authenticated backend can access tokens (via Cloud Function)
- FCM tokens are validated on registration

---

## Troubleshooting

### FCM Push Not Received

1. **Check FCM token is registered:**
   ```firestore
   // In Firestore UI
   collections/users/{uid}
   // Should have fcmToken field
   ```

2. **Check notification logs:**
   ```firestore
   // View notification_logs collection
   // See if message was sent by Cloud Function
   ```

3. **Check Cloud Function logs:**
   ```bash
   firebase functions:log
   # Look for onIncomingCall errors
   ```

4. **Verify FCM is enabled:**
   - Cloud Messaging is enabled in Firebase Console
   - Service account has messagingServiceAgent role

### Call Not Found Error

- Ensure call is created before requesting token
- Check `callId` matches exactly
- Verify user is caller or receiver

### Rate Limit Exceeded

- Implement exponential backoff in client
- Check app isn't making duplicate requests
- Rate limit resets every minute

### Agora Token Expired

- Tokens expire in 1 hour
- Request new token if call lasts > 1 hour
- Implement token refresh mechanism

---

## Monitoring & Analytics

### Notification Logs
```firestore
collection: notification_logs
{
  "callId": string,
  "receiverId": string,
  "callerId": string,
  "fcmMessageId": string,
  "sentAt": timestamp,
  "status": "sent" | "failed"
}
```

### Function Errors
```firestore
collection: function_errors
{
  "functionName": string,
  "error": string,
  "stack": string,
  "callId": string,
  "timestamp": timestamp
}
```

---

## Optional Features

### 1. Call Timeout (45 seconds)
Cloud Function `expireInactiveCalls` runs every minute:
- Marks unanswered calls as "ended" after 45 seconds
- Prevents hung calls

### 2. Call Cleanup (7 days)
Cloud Function `cleanupOldCalls` runs daily:
- Deletes calls ended >7 days ago
- Keeps Firestore collection manageable

### 3. Caller Listener
Caller can listen to Firestore:
```javascript
// Caller wants to know when receiver accepts
db.collection('calls').doc(callId).onSnapshot((doc) => {
  if (doc.data().status === 'connecting') {
    // Receiver is joining!
  }
});
```

---

## Deployment Checklist

- [ ] Install dependencies: `npm install uuid`
- [ ] Configure `.env` with Agora credentials
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Update Firestore Rules: `firebase deploy --only firestore:rules`
- [ ] Backend running with new routes
- [ ] Client registers FCM token on login
- [ ] Client listens for incoming_call notifications
- [ ] Test call flow end-to-end

---

## Support

For issues or questions:
1. Check Cloud Function logs: `firebase functions:log`
2. Check Firestore collection state
3. Verify FCM token registration
4. Check authentication token validity
