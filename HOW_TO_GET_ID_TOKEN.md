# How to Get Firebase ID Token for Postman Testing

## ⚠️ Important: UID ≠ ID Token

**You cannot use the Firebase UID directly in Postman!**

- **UID**: `4SWw8OYOT5Nz9Dxl9mQoGt5MV973` (short string) ❌
- **ID Token**: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLlNpZ25JbldpdGhDdXN0b21Ub2tlbiIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbSIsInVpZCI6IjRT...` (very long JWT string) ✅

## Quick Solution: Use the Helper Script

### Step 1: Get Your Firebase Web API Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **errunds-1780f**
3. Click the ⚙️ **Settings** icon (top left)
4. Select **Project settings**
5. Go to **General** tab
6. Scroll down to **Your apps** section
7. Find **Web API Key** (looks like: `AIzaSy...`)
8. Copy it

### Step 2: Run the Helper Script

```bash
# Using npm script (recommended)
npm run token:get <USER_UID> <API_KEY>

# Or directly
node scripts/get-id-token.js <USER_UID> <API_KEY>
```

**Example:**
```bash
npm run token:get 4SWw8OYOT5Nz9Dxl9mQoGt5MV973 AIzaSyYourApiKeyHere
```

### Step 3: Copy the ID Token

The script will output a long JWT string. Copy the **entire** token (it's very long, usually 800+ characters).

### Step 4: Paste in Postman

1. Open Postman
2. Click on **Environments** (left sidebar) or use the environment dropdown (top right)
3. Select **Errunds Backend - Local**
4. Find the `firebase_token` variable
5. Paste the entire ID token (without "Bearer " prefix)
6. Click **Save**

### Step 5: Test

Now try any authenticated endpoint (like `GET /api/v1/users/me`) - it should work! ✅

## Alternative: Get Token from Flutter App

If you have access to your Flutter app:

```dart
// After user is logged in
final user = FirebaseAuth.instance.currentUser;
if (user != null) {
  final idToken = await user.getIdToken();
  print('ID Token: $idToken');
  // Copy this token to Postman
}
```

## What the Script Does

1. Verifies the user exists in Firebase Auth
2. Generates a custom token for that user
3. Exchanges the custom token for an ID token using Firebase REST API
4. Outputs the ID token you can use in Postman

## Token Expiration

- ID tokens expire after **1 hour**
- If you get a 401 error after some time, regenerate the token using the script again

## Troubleshooting

### "User not found" error
- Make sure the UID exists in Firebase Authentication
- Check Firebase Console > Authentication > Users

### "Invalid API key" error
- Verify you copied the correct Web API Key
- Make sure it's from the same Firebase project

### Still getting 401 errors
- Make sure you copied the **entire** token (it's very long!)
- Check that there are no extra spaces or line breaks
- Verify the token hasn't expired (regenerate if needed)
