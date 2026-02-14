# FCM Incoming Calls - Quick Start Guide

## 5-Minute Setup

### 1. Install UUID Package
```bash
npm install uuid
```

### 2. Deploy Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### 3. Update Firestore Security Rules
```
// Add to firestore.rules
match /calls/{callId} {
  allow read: if request.auth.uid == resource.data.callerId || 
                 request.auth.uid == resource.data.receiverId;
  allow create, update: if request.auth.uid != null;
}
```

Deploy: `firebase deploy --only firestore:rules`

### 4. Verify Environment Variables
In `.env`:
```env
AGORA_APP_ID=your_id
AGORA_APP_CERTIFICATE=your_cert
```

## Usage Examples

### Example 1: Receiver Registers for Push Notifications

```javascript
// After user logs in
const idToken = await user.getIdToken();
const fcmToken = await messaging.getToken();

fetch('https://api.errunds.com/api/v1/calls/registerFcm', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ fcmToken })
});
```

### Example 2: Caller Initiates Call

```javascript
const callInitiation = async () => {
  const response = await fetch(
    'https://api.errunds.com/api/v1/calls/startCall',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receiverId: 'uuid-of-receiver',
        taskId: 'task-123'
      })
    }
  );

  const { data } = await response.json();
  console.log('Call started:', data.callId);
  return data.callId;
};
```

### Example 3: Receiver Gets FCM Push & Accepts Call

```javascript
// In service worker or foreground messaging handler
messaging.onMessage((payload) => {
  if (payload.data.type === 'incoming_call') {
    const { callId, callerId, taskId } = payload.data;
    
    // Show incoming call UI
    showIncomingCallUI({
      callId,
      callerId,
      taskId,
      onAccept: () => acceptCall(callId),
      onReject: () => rejectCall(callId)
    });
  }
});

const acceptCall = async (callId) => {
  // Step 1: Request Agora token
  const tokenResponse = await fetch(
    'https://api.errunds.com/api/v1/calls/call/token',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ callId })
    }
  );

  const { data } = await tokenResponse.json();
  const { token, channelName } = data;

  // Step 2: Join Agora channel with token
  const rtcEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  await rtcEngine.join(
    process.env.REACT_APP_AGORA_APP_ID,
    channelName,
    token,
    null
  );

  // Step 3: Enable local audio/video
  let localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  let localVideoTrack = await AgoraRTC.createCameraVideoTrack();

  await rtcEngine.publish([localAudioTrack, localVideoTrack]);
};
```

### Example 4: Caller Monitors Receiver & Joins

```javascript
const initiateCallWithMonitoring = async (receiverId, taskId) => {
  // Start the call
  const response = await fetch(
    'https://api.errunds.com/api/v1/calls/startCall',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ receiverId, taskId })
    }
  );

  const { data } = await response.json();
  const callId = data.callId;

  // Listen to call status changes
  const unsubscribe = db.collection('calls').doc(callId).onSnapshot(
    (doc) => {
      const status = doc.data().status;

      if (status === 'connecting') {
        // Receiver accepted! Now join the call
        joinCallAsCallerCallerJoinsCall(callId);
        unsubscribe();
      } else if (status === 'ended') {
        // Call was rejected or ended
        showCallRejectedMessage();
        unsubscribe();
      }
    }
  );

  // Timeout if no response after 45 seconds
  setTimeout(() => {
    unsubscribe();
    showCallTimeoutMessage();
  }, 45000);
};

const joinCallAsCallerCaller = async (callId) => {
  const tokenResponse = await fetch(
    'https://api.errunds.com/api/v1/calls/call/token',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ callId })
    }
  );

  const { data } = await tokenResponse.json();
  const { token, channelName } = data;

  // Join Agora channel
  const rtcEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  await rtcEngine.join(
    process.env.REACT_APP_AGORA_APP_ID,
    channelName,
    token,
    null
  );

  // Enable local audio/video
  let localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  let localVideoTrack = await AgoraRTC.createCameraVideoTrack();
  await rtcEngine.publish([localAudioTrack, localVideoTrack]);
};
```

### Example 5: End Call

```javascript
const endCall = async (callId) => {
  // API call to end call
  await fetch('https://api.errunds.com/api/v1/calls/endCall', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ callId })
  });

  // Leave Agora channel
  await rtcEngine.leave();
};
```

## API Endpoint Reference

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| POST | `/api/v1/calls/registerFcm` | Register FCM token | ✓ |
| POST | `/api/v1/calls/startCall` | Start new call | ✓ |
| POST | `/api/v1/calls/call/token` | Get Agora token | ✓ |
| POST | `/api/v1/calls/endCall` | End active call | ✓ |
| GET | `/api/v1/calls/call/:callId` | Get call details | ✓ |

## Call Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CALL INITIATION                       │
└─────────────────────────────────────────────────────────┘

Caller                  Backend              Cloud Function    Receiver
  │                       │                        │              │
  ├─ POST /startCall ──→  │                        │              │
  │                       ├─ Create calls/{callId}──┤              │
  │                       │    status: "ringing"   │              │
  │                       │                        ├─ Fetch FCM token
  │   ← {callId} ────────┤                        │              │
  │                       │                        ├─ Send FCM push────→
  │                       │                        │              │
  │                       │                        │         (receives)
  │                       │                        │              │
  │   ┌──────────────────────────────────────────────────────────┐
  │   │                   USER ACCEPTS CALL                       │
  │   └──────────────────────────────────────────────────────────┘
  │                       │                        │              │
  │                       │                        │        POST /token ──┐
  │                       │                        │              │      │
  │                       │        ← GET token ────────────────--┤      │
  │                       ├─ Update status        │              │      │
  │   ← GET token ───────┤  to "connecting"       │              │      │
  │                       │                        │              │      │
  │  Start video          │                        │       Start video ←┘
  │  Join Agora channel   │                        │       Join Agora
  │  (using token)────────┼────────────────────────┼──────→        │
  │                       │                        │              │
  │  ◄──────────────────────────────────────────────────────── Media  │
  │  Media ────────────────────────────────────────────────────────→ │
  │                       │                        │              │
  │  ┌──────────────────────────────────────────────────────────┐
  │  │              EITHER PARTY ENDS CALL                       │
  │  └──────────────────────────────────────────────────────────┘
  │                       │                        │              │
  ├─ POST /endCall ──────┤                        │              │
  │                       ├─ Update status        │              │
  │                       │   to "ended"          │              │
  │                       │                        │              │
  │  Leave Agora          │                        │       Leave Agora
  │                       │                        │       POST /endCall──→
  ▼                       ▼                        ▼              ▼
```

## Firestore Collections Structure

```
Database Root
│
├─ calls/
│  └─ {callId}
│     ├─ callId: string
│     ├─ taskId: string
│     ├─ callerId: string
│     ├─ receiverId: string
│     ├─ status: "ringing|connecting|connected|ended"
│     ├─ channelName: string
│     ├─ createdAt: timestamp
│     ├─ updatedAt: timestamp (optional)
│     ├─ endedAt: timestamp (optional)
│     └─ endedBy: string (optional)
│
├─ users/
│  └─ {uid}
│     ├─ ... (existing fields)
│     ├─ fcmToken: string
│     └─ fcmTokenUpdatedAt: timestamp
│
├─ notification_logs/ (auto-generated by Cloud Function)
│  └─ {auto-id}
│     ├─ callId: string
│     ├─ receiverId: string
│     ├─ callerId: string
│     ├─ fcmMessageId: string
│     ├─ sentAt: timestamp
│     └─ status: "sent|failed"
│
└─ function_errors/ (auto-generated by Cloud Function)
   └─ {auto-id}
      ├─ functionName: string
      ├─ error: string
      ├─ stack: string
      ├─ callId: string
      └─ timestamp: timestamp
```

## Testing in Postman

### 1. Register FCM Token
```
POST /api/v1/calls/registerFcm
Headers:
  Authorization: Bearer <ID_TOKEN>
  Content-Type: application/json

Body:
{
  "fcmToken": "cOxzI-...longTokenString...-7G2w"
}
```

### 2. Start Call
```
POST /api/v1/calls/startCall
Headers:
  Authorization: Bearer <ID_TOKEN>
  Content-Type: application/json

Body:
{
  "receiverId": "user-id-of-receiver",
  "taskId": "task-123"
}
```

### 3. Get Agora Token
```
POST /api/v1/calls/call/token
Headers:
  Authorization: Bearer <ID_TOKEN>
  Content-Type: application/json

Body:
{
  "callId": "returned-from-startCall"
}
```

### 4. End Call
```
POST /api/v1/calls/endCall
Headers:
  Authorization: Bearer <ID_TOKEN>
  Content-Type: application/json

Body:
{
  "callId": "the-call-id"
}
```

### 5. Get Call Details
```
GET /api/v1/calls/call/{callId}
Headers:
  Authorization: Bearer <ID_TOKEN>
```

## Debugging Tips

### Check if FCM token is registered:
```javascript
// In Firestore console
// Navigate to users/{uid}
// Should see fcmToken field
```

### View Cloud Function logs:
```bash
firebase functions:log
```

### Check notification was sent:
```javascript
// In Firestore console
// Navigate to notification_logs collection
// Should see entry with callId and status: "sent"
```

### Verify call document structure:
```javascript
// In Firestore console
// Navigate to calls/{callId}
// Check all required fields are present
```

### Test rate limiting:
```bash
# This should succeed (1st call)
curl -X POST https://api.errunds.com/api/v1/calls/startCall

# Run this 5+ times rapidly - should get 429 after 5th call
```

---

## Common Issues

**Push notification not received:**
- FCM token not registered (check users/{uid}.fcmToken)
- Cloud Function not deployed
- User not subscribed to Cloud Messaging

**"Call not found" error:**
- Wrong callId sent
- Call document not created yet
- Calling from wrong user account

**Rate limit exceeded:**
- Wait 60 seconds or implement exponential backoff
- Check for duplicate requests in app

**Agora token invalid:**
- App ID/Certificate not configured
- Token already expired (valid 1 hour only)
- Channel name mismatch
