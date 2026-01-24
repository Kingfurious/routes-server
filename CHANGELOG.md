# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-05

### Added

#### Core API Implementation
- **Express.js Server Setup**
  - Main application entry point with Express server
  - CORS middleware configuration
  - JSON body parser middleware
  - Error handling middleware
  - 404 handler for undefined routes

- **Firebase Integration**
  - Firebase Admin SDK initialization with service account credentials
  - Authentication middleware for Firebase ID token verification
  - Firestore database integration for all data operations

#### User Management APIs
- **User Profile Endpoints**
  - `GET /api/v1/users/me` - Fetch logged-in user profile
  - `POST /api/v1/users/me` - Create user profile (idempotent, first login)
  - `PUT /api/v1/users/me` - Update user profile (name, phone, isOnboarded, lastLoginAt)
  - `PATCH /api/v1/users/me/onboarding` - Mark onboarding as completed
  - `GET /api/v1/users/me/status` - Check account status (status, isOnboarded)

- **User Settings Endpoints**
  - `GET /api/v1/users/me/settings` - Fetch user preferences
  - `PUT /api/v1/users/me/settings` - Update user settings (language, theme, notifications, stayLoggedIn)

- **User Terms Acceptance Endpoints**
  - `GET /api/v1/users/me/terms` - Check accepted terms versions
  - `POST /api/v1/users/me/terms` - Accept latest terms (one-time write)

#### Terms & Privacy APIs
- **Public Endpoints (No Authentication Required)**
  - `GET /api/v1/terms/active` - Get all active Terms & Privacy documents
  - `GET /api/v1/terms/:type` - Get latest active document by type (terms/privacy)

#### Authentication APIs
- **Token Validation**
  - `GET /api/v1/auth/validate` - Validate Firebase ID token and return user info

#### Project Structure
- **Modular Architecture**
  - Controllers layer (`src/controllers/`) for business logic
  - Routes layer (`src/routes/`) for API route definitions
  - Middleware layer (`src/middleware/`) for authentication
  - Separation of concerns for maintainability

#### Firestore Collections Support
- User document structure matching Firestore schema:
  - `activeRole` (customer/runner)
  - `isCustomer` and `isRunner` boolean fields
  - `authProvider`, `isOnboarded`, `status` fields
  - Timestamp fields (`createdAt`, `updatedAt`, `lastLoginAt`)

#### Developer Tools
- **Helper Scripts**
  - `scripts/get-id-token.js` - Generate Firebase ID token from UID for testing
  - `scripts/generate-test-token.js` - Generate Firebase custom token from UID
  - NPM scripts: `token:get` and `token:custom`

- **Postman Collection**
  - Complete Postman collection with all 13 API endpoints
  - Postman environment file with variables
  - Organized folder structure (Auth, Users, Terms & Privacy)
  - Sample request bodies for all POST/PUT endpoints
  - Pre-configured Authorization headers

#### Documentation
- **README.md** - Comprehensive project documentation
  - Installation instructions
  - API endpoint documentation
  - Project structure overview
  - Testing guide
  - Configuration guide

- **CHANGELOG.md** - Version history and changes

- **POSTMAN_SETUP.md** - Detailed Postman setup and testing guide
  - Import instructions
  - Environment configuration
  - Testing workflow
  - Troubleshooting guide

- **HOW_TO_GET_ID_TOKEN.md** - Guide for obtaining Firebase ID tokens
  - Explanation of UID vs ID Token
  - Step-by-step instructions
  - Helper script usage

#### Configuration
- **Package.json**
  - Express.js dependency
  - Firebase Admin SDK dependency
  - CORS middleware
  - Nodemon for development
  - Custom npm scripts

- **Git Configuration**
  - `.gitignore` for sensitive files (services.json, node_modules, .env)
  - Feature branch: `feature/sprint-1-api-implementation`

### Changed

- **User Document Structure**
  - Updated from `role` field to `activeRole`, `isCustomer`, `isRunner` to match Firestore schema
  - Changed `phone` default from empty string to `null`

### Security

- Firebase service account credentials excluded from version control
- All user endpoints protected with Firebase ID token authentication
- Token verification using Firebase Admin SDK
- CORS enabled for cross-origin requests

### Technical Details

- **API Version**: v1
- **Base Path**: `/api/v1`
- **Default Port**: 8080
- **Authentication**: Firebase ID Token (Bearer token)
- **Database**: Google Cloud Firestore
- **Error Handling**: Consistent error response format
- **Response Format**: JSON with `success`, `message`, and `data` fields

### Known Issues

- None at this time

### Migration Notes

- This is the initial release (Sprint 1)
- All endpoints follow RESTful conventions
- User profile creation is idempotent (safe to call multiple times)
- Terms acceptance is one-time write only (no updates allowed)

---

## [1.1.0] - 2026-01-18

### Added

#### Task Management APIs
- **Task Metadata Endpoint (Public)**
  - `GET /api/v1/tasks/metadata` - Fetch bundled task metadata for Create Task flow
    - Returns single cache object with `version`, `lastUpdatedAt`, `categories`, `taskTypes`, and `fieldConfigs`
    - Public endpoint (no authentication required)
    - Optimized for Flutter app caching (Hive/Isar)
    - HTTP cache headers for client-side caching

- **Task CRUD Endpoints (Authenticated)**
  - `POST /api/v1/tasks` - Create a new task
    - Accepts `categoryId`, `taskTypeId`, `location`, schedule fields, `dynamicFields`, payment info
    - Validates required fields and stores `dynamicFields` as-is (no interpretation)
    - Generates unique task ID and human-readable task number
    - Sets default status to "pending"
  
  - `GET /api/v1/tasks/my` - Get all tasks for authenticated customer
    - Returns tasks ordered by `createdAt` (newest first)
    - Requires Firestore composite index on `customerId` + `createdAt`
  
  - `GET /api/v1/tasks/:taskId` - Get single task by ID
    - Owner-only authorization (only task owner can view)
    - Returns 404 if task not found, 403 if unauthorized
  
  - `PUT /api/v1/tasks/:taskId` - Update task
    - Owner-only authorization
    - Field restrictions: only allows updates to location, schedule, `dynamicFields`, notes, photos, payment info
    - Business rule: cannot update completed or cancelled tasks
    - Cannot update system-managed fields (status, runnerId, timestamps)
    - Automatically updates `updatedAt` timestamp
  
  - `DELETE /api/v1/tasks/:taskId` - Delete/cancel task
    - Owner-only authorization
    - Soft delete: sets status to "cancelled" (preserves data history)
    - Business rule: cannot delete completed tasks

#### Task Metadata Controller
- **Data Fetching & Processing**
  - Fetches from Firestore collections: `task_categories`, `task_types`, `task_type_fields`, `task_metadata_meta`
  - Flexible `isActive` filtering: treats missing/undefined as active (only excludes if explicitly `false`)
  - Fetches all task types and field configs, filters in-memory for better reliability
  
- **Data Cleaning & Normalization**
  - Removes duplicate/spaced field names (e.g., `"id ": "value"`)
  - Trims whitespace and newlines from IDs and string values
  - Converts Firestore Timestamps to milliseconds for consistent JSON output
  - Normalizes field names to prevent data quality issues

- **Logging & Debugging**
  - Console logging for document counts (categories, task types, field configs)
  - Warning messages if expected data is missing
  - Error logging for troubleshooting

#### Firestore Collections Support
- **Task Collections**
  - `task_categories` - Category definitions with display order, icons, notes
  - `task_types` - Task type definitions linked to categories via `categoryId`
  - `task_type_fields` - Dynamic form field configurations linked to task types
  - `task_metadata_meta` - Metadata versioning (singleton document)
  - `tasks` - Customer-created task documents with full lifecycle tracking

- **Task Document Structure**
  - Customer identification (`customerId`, `customerEmail`, `customerName`)
  - Task details (`categoryId`, `taskTypeId`, `taskName`, `taskDescription`)
  - Location object (`address`, `latitude`, `longitude`, `placeName`)
  - Schedule fields (`scheduledDate`, `scheduledTime`, `scheduledDateTime`)
  - Dynamic fields (`dynamicFields` object - stored as-is, no interpretation)
  - Payment information (`paymentStatus`, `paymentId`, `paymentAmount`, `estimatedCost`, `budget`)
  - Task lifecycle (`status`, `runnerId`, `acceptedAt`, `startedAt`, `completedAt`)
  - Timestamps (`createdAt`, `updatedAt`)

#### Developer Tools
- **Postman Collection Updates**
  - Added 3 new task endpoints to Tasks folder
  - Get Task By ID request with path variable
  - Update Task request with example request body
  - Delete Task request
  - All requests include proper authentication headers

#### Documentation
- **FIRESTORE_INDEX_SETUP.md** - Firestore index creation guide
  - Instructions for creating composite index on `tasks` collection
  - Quick method using error URL
  - Manual method via Firebase Console
  - Index details and verification steps

### Changed

- **Task Metadata Endpoint Behavior**
  - Removed strict `isActive` filter from task types query
  - Now fetches all task types and filters in-memory (more reliable)
  - Field configs filtering logic improved to handle edge cases
  - Added data cleaning to prevent duplicate fields and whitespace issues

### Security

- All task CRUD endpoints protected with Firebase ID token authentication
- Owner-only authorization for get, update, and delete operations
- Field-level restrictions on task updates (prevents status manipulation)
- Business rules prevent unauthorized state changes

### Technical Details

- **Task Status Flow**: `pending` → `active` → `in_progress` → `completed` (or `cancelled`)
- **Soft Delete**: Tasks are marked as "cancelled" rather than physically deleted
- **Dynamic Fields**: Backend stores `dynamicFields` as-is without interpretation (Flutter handles form logic)
- **Metadata Caching**: Single bundled JSON object for zero-latency UI in Flutter app
- **Firestore Index Required**: Composite index on `tasks` collection (`customerId` Ascending + `createdAt` Descending)

### Known Issues

- Firestore composite index must be created manually before `GET /api/v1/tasks/my` will work
- See `FIRESTORE_INDEX_SETUP.md` for index creation instructions

### Migration Notes

- **Firestore Index**: Create the required composite index before using `GET /api/v1/tasks/my`
  - Use the error URL provided by Firestore, or follow manual instructions in `FIRESTORE_INDEX_SETUP.md`
- **Metadata Endpoint**: Public endpoint, can be called without authentication
- **Task Creation**: Requires `categoryId`, `taskTypeId`, `location`, schedule, and `dynamicFields`
- **Task Updates**: Only allowed fields can be updated; system-managed fields are protected
- **Task Deletion**: Soft delete preserves data history; completed tasks cannot be deleted

---

## [Unreleased]

### Planned Features
- Additional Sprint 2 features (to be documented)

---

## Version History

- **1.1.0** (2026-01-18) - Task management APIs with metadata endpoint, CRUD operations, and Firestore index setup
- **1.0.0** (2026-01-05) - Initial release with Sprint 1 API implementation
