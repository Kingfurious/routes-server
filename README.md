# Errunds Backend API

Express.js backend API for Errunds application, providing RESTful endpoints for user management, settings, terms & privacy, and authentication validation.

## 🚀 Features

- **User Profile Management** - Create, read, and update user profiles
- **User Settings** - Manage user preferences (language, theme, notifications)
- **Terms & Privacy** - Versioned legal documents management
- **Terms Acceptance** - Track user acceptance of terms and privacy policies
- **Firebase Authentication** - Secure token-based authentication using Firebase Admin SDK
- **Firestore Integration** - Direct integration with Google Cloud Firestore

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

## 📦 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- Firebase service account credentials

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd errunds-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase credentials (see [Configuration](#configuration))

## ⚙️ Configuration

### Firebase Setup

1. Download your Firebase service account key:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file

2. Place the service account file:
   - Save as `src/services.json` in the project root
   - **Note**: This file is in `.gitignore` for security

### Environment Variables

Create a `.env` file (optional, for custom configuration):
```env
PORT=8080
```

## 🏃 Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:8080` (or the port specified in `PORT` environment variable).

## 📚 API Documentation

### Base URL
```
http://localhost:8080/api/v1
```

### Authentication

Most endpoints require Firebase ID token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

### Endpoints

#### 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/validate` | Validate token and return user info | ✅ |

#### 👤 User Profile

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get user profile | ✅ |
| POST | `/users/me` | Create user profile (idempotent) | ✅ |
| PUT | `/users/me` | Update user profile | ✅ |
| PATCH | `/users/me/onboarding` | Mark onboarding as completed | ✅ |
| GET | `/users/me/status` | Get account status | ✅ |

#### ⚙️ User Settings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me/settings` | Get user settings | ✅ |
| PUT | `/users/me/settings` | Update user settings | ✅ |

#### 📋 Terms Acceptance

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me/terms` | Get accepted terms versions | ✅ |
| POST | `/users/me/terms` | Accept latest terms | ✅ |

#### 📄 Terms & Privacy (Public)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/terms/active` | Get all active terms | ❌ |
| GET | `/terms/:type` | Get latest by type (terms/privacy) | ❌ |

### Request/Response Examples

#### Create User Profile
```http
POST /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mahesh ",
  "phone": "+911234567890",
  "authProvider": "email"
}
```

#### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mahesh M",
  "phone": "+911234567891"
}
```

#### Update User Settings
```http
PUT /api/v1/users/me/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "stayLoggedIn": true,
  "notificationsEnabled": true,
  "language": "en",
  "theme": "dark"
}
```

#### Accept Terms
```http
POST /api/v1/users/me/terms
Authorization: Bearer <token>
Content-Type: application/json

{
  "termsVersion": "v1.0",
  "privacyVersion": "v1.0"
}
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

#### Error Response
```json
{
  "error": "Error Type",
  "message": "Error description"
}
```

### Status Codes

- `200 OK` - Successful GET/PUT/PATCH requests
- `201 Created` - Successful POST requests
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## 📁 Project Structure

```
errunds-backend/
├── src/
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── termsController.js
│   │   └── userController.js
│   ├── middleware/            # Express middleware
│   │   └── auth.js           # Firebase token verification
│   ├── routes/               # API route definitions
│   │   ├── auth.js
│   │   ├── terms.js
│   │   └── users.js
│   ├── services.json         # Firebase service account (gitignored)
│   └── index.js              # Main application entry point
├── scripts/                  # Utility scripts
│   ├── generate-test-token.js
│   └── get-id-token.js
├── Postman_API_json/         # Postman collection files
│   ├── Errunds_Backend_API.postman_collection.json
│   ├── Errunds_Backend_Environment.postman_environment.json
│   └── POSTMAN_SETUP.md
├── .gitignore
├── package.json
├── README.md
├── CHANGELOG.md
└── HOW_TO_GET_ID_TOKEN.md
```

## 🧪 Testing

### Using Postman

1. Import the Postman collection from `Postman_API_json/Errunds_Backend_API.postman_collection.json`
2. Import the environment from `Postman_API_json/Errunds_Backend_Environment.postman_environment.json`
3. Get your Firebase ID token (see [HOW_TO_GET_ID_TOKEN.md](./HOW_TO_GET_ID_TOKEN.md))
4. Set the `firebase_token` variable in Postman environment
5. Start testing!

For detailed Postman setup instructions, see [POSTMAN_SETUP.md](./Postman_API_json/POSTMAN_SETUP.md)

### Getting Firebase ID Token

Use the helper script to generate an ID token from a user UID:

```bash
npm run token:get <USER_UID> <FIREBASE_API_KEY>
```

For more details, see [HOW_TO_GET_ID_TOKEN.md](./HOW_TO_GET_ID_TOKEN.md)

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the server in production mode |
| `npm run dev` | Start the server in development mode with auto-reload |
| `npm run token:get` | Generate Firebase ID token from UID |
| `npm run token:custom` | Generate Firebase custom token from UID |

## 🔒 Security

- Firebase service account credentials (`src/services.json`) are gitignored
- All user endpoints require Firebase ID token authentication
- Tokens are verified using Firebase Admin SDK
- CORS is enabled for cross-origin requests

## 🗄️ Firestore Collections

The API interacts with the following Firestore collections:

- `users/{uid}` - User profile data
- `user_settings/{uid}` - User preferences and settings
- `terms_versions/{versionId}` - Versioned terms and privacy documents
- `user_terms_acceptance/{uid}` - User terms acceptance records

## 🛠️ Technologies Used

- **Express.js** - Web framework
- **Firebase Admin SDK** - Authentication and Firestore access
- **CORS** - Cross-origin resource sharing
- **Node.js** - Runtime environment

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | `8080` |

## 🤝 Contributing

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git commit -m "feat: your feature description"
   ```

3. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request


## 👥 Authors

- [Mahesh015-code](https://github.com/Mahesh015-code/)

## 🔗 Related Documentation

- [Postman Setup Guide](./Postman_API_json/POSTMAN_SETUP.md)
- [How to Get ID Token](./HOW_TO_GET_ID_TOKEN.md)
- [Changelog](./CHANGELOG.md)

## 📞 Support

For issues and questions, please open an issue in the repository.
