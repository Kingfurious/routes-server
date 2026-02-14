# Cloud Function Deployment Guide

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created
- Authenticated with Firebase: `firebase login`
- Functions enabled on Firebase project

## File Structure

```
errunds-backend/
├─ functions/
│  ├─ index.js          (Cloud Function code)
│  └─ package.json      (Function dependencies)
├─ src/
│  ├─ ... (existing code)
├─ firebase.json        
├─ firestore.rules
└─ .env
```

## Step-by-Step Deployment

### 1. Initialize Functions (if not already done)

```bash
firebase init functions
```

This creates the `functions/` directory with `index.js` and `package.json`.

### 2. Install Function Dependencies

```bash
cd functions
npm install
```

The `package.json` already includes:
- `firebase-admin` - Admin SDK
- `firebase-functions` - Cloud Functions SDK

### 3. Deploy the Functions

```bash
# From project root
firebase deploy --only functions
```

Output should show:
```
✔  Deploy complete!

Function URL (onIncomingCall): <trigger-url>
Function URL (cleanupOldCalls): <url>
Function URL (expireInactiveCalls): <url>
```

### 4. Verify Deployment

```bash
# List deployed functions
firebase functions:list

# View logs
firebase functions:log

# Filter by function name
firebase functions:log --follow --function=onIncomingCall
```

### 5. Configure Firestore Rules to Allow Cloud Function

Update `firestore.rules`:

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

    // Users collection - read FCM token
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    // Notification logs - written by Cloud Function
    match /notification_logs/{document=**} {
      allow read: if false; // Only admins in Firebase Console
      allow write: if request.auth.uid == null; // Cloud Function only
    }

    // Function errors - written by Cloud Function
    match /function_errors/{document=**} {
      allow read: if false;
      allow write: if request.auth.uid == null; // Cloud Function only
    }

    // ... other collections
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Cloud Function Triggers Explained

### 1. onIncomingCall (Firestore onCreate)

- **Trigger:** `calls/{callId}` document created
- **Runtime:** ~1-5 seconds
- **Action:** Sends FCM push to receiver
- **Failure Handling:** Logs to `function_errors` collection

```
Flow:
calls/{callId} created (by backend)
    ↓
firebase.firestore.document.onCreate event
    ↓
onIncomingCall function executes
    ↓
Fetches users/{receiverId}.fcmToken
    ↓
Sends FCM message via admin.messaging()
    ↓
Logs to notification_logs
```

### 2. cleanupOldCalls (Scheduled - Daily)

- **Schedule:** Daily at 2 AM UTC
- **Action:** Deletes calls ended >7 days ago
- **Optional:** Can disable if you want to keep history

### 3. expireInactiveCalls (Scheduled - Hourly)

- **Schedule:** Every minute
- **Action:** Marks unanswered calls as "ended" after 45 seconds
- **Optional:** Can disable if you have custom timeout logic

## Local Testing with Emulator

### Setup Emulator

```bash
# Install emulator
firebase init emulators

# Select: Firestore, Functions, Pub/Sub
```

### Run Emulator

```bash
firebase emulators:start
```

Access emulator:
- Firestore Emulator UI: http://localhost:4000
- Functions: http://localhost:5001
- Pub/Sub: http://localhost:8085

### Test Function Locally

```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Create test call document
firebase firestore:delete calls/test-call-id --project emulator
firebase firestore:set calls/test-call-id \
  '{
    "callId": "test-call-id",
    "taskId": "task-123",
    "callerId": "user-1",
    "receiverId": "user-2",
    "status": "ringing",
    "channelName": "call_test-call-id",
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }' --project emulator
```

Watch logs in Terminal 1 to see function execution.

## Production Configuration

### Environment Variables

Functions don't use `.env` files directly. For secrets:

```bash
# Set secret in Cloud Functions
firebase functions:config:set service.key="value"

# Access in function
const serviceKey = functions.config().service.key;

# Or use Google Cloud Secret Manager for better security
```

### Performance Optimization

**Function tuning:**
```javascript
exports.onIncomingCall = functions
  .region('us-central1')        // Closest to users
  .runWith({
    memory: 256,                // MB (256-4GB)
    timeout: 60,                // seconds
    maxInstances: 100           // concurrent executions
  })
  .firestore.document('calls/{callId}')
  .onCreate(async (snap, context) => {
    // function code
  });
```

### Monitoring

View in Firebase Console:
- **Functions Usage:** Executions, errors, duration
- **Logs:** All function output
- **Performance:** Memory, CPU usage

CLI monitoring:
```bash
firebase functions:log --follow
firebase functions:log --follow --function=onIncomingCall
firebase functions:log --limit=50
```

## Troubleshooting

### Function Not Triggering

Check:
1. Function deployed: `firebase functions:list`
2. Trigger rule correct: `calls/{callId}` matches document path
3. Firestore rules allow Cloud Function: `request.auth.uid == null` in write rules
4. Function not in error loop (check logs)

### "Permission denied" Error

Add to Firestore rules:
```
match /notification_logs/{document=**} {
  allow write: if request.auth.uid == null; // Allows Cloud Function
}
```

### "fcmToken not found" Warning

Expected if user hasn't called `POST /registerFcm` yet.

**To fix:**
1. Ensure client calls `registerFcm` after login
2. Check user document has `fcmToken` field
3. Verify token format is valid

### Function Timeout

If function executes >60 seconds:

```javascript
exports.onIncomingCall = functions
  .runWith({
    timeout: 120  // Increase from 60 to 120 seconds
  })
  .firestore.document('calls/{callId}')
  .onCreate(async (snap, context) => {
    // function code
  });
```

### High Function Costs

Optimize:
```javascript
// AVOID: Reading entire collection
const allUsers = await db.collection('users').get();

// GOOD: Read only what you need
const receiverDoc = await db.collection('users').doc(receiverId).get();
```

## Rollback

If function is causing issues:

```bash
# Delete specific function
firebase functions:delete onIncomingCall

# Redeploy specific function
firebase deploy --only functions:onIncomingCall

# Or completely remove functions directory and delete
firebase functions:delete
```

## Advanced: Custom HTTP Function

If you need an HTTP endpoint from a Cloud Function:

```javascript
exports.generateCallToken = functions
  .https.onCall(async (data, context) => {
    // context.auth has authenticated user
    const { callId } = data;
    // ... generate token
    return { token, channelName };
  });
```

Call from client:
```javascript
const generateToken = firebase
  .functions()
  .httpsCallable('generateCallToken');

const result = await generateToken({ callId: 'xyz' });
```

## Deployment Checklist

- [ ] `functions/index.js` has all three functions
- [ ] `functions/package.json` lists dependencies
- [ ] Firebase CLI installed and authenticated
- [ ] Firestore rules allow Cloud Function writes
- [ ] `firebase deploy --only functions` succeeds
- [ ] `firebase functions:list` shows 3 functions
- [ ] `firebase functions:log` shows no errors
- [ ] Test: Create call document, verify notification_logs entry
- [ ] Test: Client receives FCM push notification

## Cost Considerations

Cloud Functions billing:
- Invocations: First 2M/month free
- Compute time: Pay per GB-second
- Network: No charge for Cloud Firestore access

**Rough estimates:**
- 1,000 calls/day = ~$0.10/month
- 10,000 calls/day = ~$1/month
- 100,000 calls/day = ~$10/month

[Full pricing](https://cloud.google.com/functions/pricing)

## Support & Documentation

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Firestore Triggers](https://firebase.google.com/docs/firestore/extend-with-functions)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
