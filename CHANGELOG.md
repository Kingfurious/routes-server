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

## [Unreleased]

### Planned Features
- Additional Sprint 2 features (to be documented)

---

## Version History

- **1.0.0** (2026-01-05) - Initial release with Sprint 1 API implementation
