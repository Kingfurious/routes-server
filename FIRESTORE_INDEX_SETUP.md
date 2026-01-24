# Firestore Index Setup Instructions

## Required Index for Tasks Collection

The `GET /api/v1/tasks/my` endpoint requires a composite index on the `tasks` collection.

### Quick Method (Recommended)

1. When you encounter the index error, Firebase will provide a URL like:
   ```
   https://console.firebase.google.com/v1/r/project/errunds-1780f/firestore/indexes?create_composite=...
   ```

2. Copy the entire URL from the error message

3. Open it in your browser (while logged into Firebase)

4. Click "Create Index" and wait 2-3 minutes for it to build

5. The index will show as "Building" initially, then change to "Enabled" when ready

### Manual Method

1. Go to [Firebase Console](https://console.firebase.google.com/)

2. Select your project: `errunds-1780f`

3. Navigate to: **Firestore Database** → **Indexes** tab

4. Click **"Add Index"** (make sure you're on the **Composite** tab)

5. Fill in the index details:
   - **Collection ID**: `tasks`
   - **Fields to index**:
     - Field 1: `customerId`, **Ascending**
     - Field 2: `createdAt`, **Descending**
   - **Query scope**: Collection

6. Click **"Create Index"**

7. Wait 2-3 minutes for the index to build (status will show "Building" → "Enabled")

### Index Details

- **Collection**: `tasks`
- **Fields**:
  - `customerId` (Ascending)
  - `createdAt` (Descending)
- **Purpose**: Enables querying tasks by customer ID, ordered by creation date (newest first)

### Verification

Once the index is enabled, the `GET /api/v1/tasks/my` endpoint should work without errors.
