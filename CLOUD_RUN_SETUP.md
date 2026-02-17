# Deploying errunds-backend to Google Cloud Run

> **Browser-only** — every step uses the [Google Cloud Console](https://console.cloud.google.com) or the built-in **Cloud Shell** terminal. No local CLI installation required.

---

## Prerequisites

| Item | Where to get it |
|------|-----------------|
| Google account with billing enabled | <https://console.cloud.google.com/billing> |
| This repo pushed to a Git host (GitHub / Cloud Source Repos) | Your choice |

---

## 1 — Create (or select) a GCP Project

1. Open **<https://console.cloud.google.com>**.
2. Click the project selector dropdown (top-left, next to "Google Cloud").
3. Click **New Project** → give it a name (e.g. `errunds`) → **Create**.
4. Make sure the new project is selected.

---

## 2 — Enable Required APIs

1. Go to **APIs & Services → Library** (left sidebar).
2. Search for and **Enable** each of the following:
   - **Cloud Run Admin API**
   - **Cloud Build API**
   - **Artifact Registry API**
   - **Routes API** (so the backend can call `routes.googleapis.com`)

---

## 3 — Create an Artifact Registry Docker Repository

1. Go to **Artifact Registry** (left sidebar, or search in the top bar).
2. Click **+ Create Repository**.
3. Fill in:
   - **Name**: `errunds-docker`
   - **Format**: Docker
   - **Region**: choose your closest region (e.g. `us-central1`)
4. Click **Create**.

---

## 4 — Create a Routes API Key (Server-Side)

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → API key**.
3. Click **Edit** (pencil icon) on the newly created key.
4. Rename it to `Routes API – Server`.
5. Under **API restrictions**, select **Restrict key** → choose only **Routes API**.
6. Under **Application restrictions**, select **None** (Cloud Run doesn't have a static IP by default).
   > **Tip**: If you want IP restriction later, assign a static IP to Cloud Run via a Cloud NAT + VPC connector and restrict the key to that IP.
7. Click **Save**. Copy the key value — you'll need it in Step 6.

---

## 5 — Build & Push the Docker Image (via Cloud Shell)

1. Click the **Activate Cloud Shell** button (`>_` icon, top-right toolbar).
2. In the Cloud Shell terminal, clone your repo:
   ```bash
   git clone https://github.com/<YOUR_ORG>/errunds-backend.git
   cd errunds-backend
   ```
3. Build and push to Artifact Registry using Cloud Build:
   ```bash
   export REGION=us-central1          # match your Artifact Registry region
   export PROJECT_ID=$(gcloud config get-value project)

   gcloud builds submit \
     --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/errunds-docker/errunds-backend:latest
   ```
4. Wait for the build to complete (takes ~1–2 minutes).

---

## 6 — Deploy to Cloud Run

1. Go to **Cloud Run** (left sidebar).
2. Click **+ Create Service**.
3. Fill in:
   - **Container image**: Click **Select** → choose the image from Artifact Registry (`errunds-docker / errunds-backend : latest`).
   - **Service name**: `errunds-backend`
   - **Region**: same region as your Artifact Registry (e.g. `us-central1`).
4. Under **Container, Networking, Security**:
   - **Container port**: `8080`
   - **Memory**: `256 MiB` (sufficient for this Express app)
   - **CPU**: `1`
   - **Min instances**: `0` (scale to zero when idle)
   - **Max instances**: `10` (adjust to your needs)
5. Under **Variables & Secrets** → **Environment variables**, add:

   | Name | Value |
   |------|-------|
   | `ROUTES_API_KEY` | *(paste the key from Step 4)* |
   | `AGORA_APP_ID` | *(your Agora App ID)* |
   | `AGORA_APP_CERTIFICATE` | *(your Agora App Certificate)* |

6. Under **Authentication**: select **Allow unauthenticated invocations** (the app uses its own Firebase Auth middleware).
7. Click **Create**.

---

## 7 — Verify the Deployment

1. Once deployed, Cloud Run shows a URL like:
   ```
   https://errunds-backend-XXXXXXX-uc.a.run.app
   ```
2. Click the URL — you should see `Errunds Backend Running`.
3. Test the route proxy (replace with a valid token):
   ```bash
   curl -X POST https://errunds-backend-XXXXXXX-uc.a.run.app/api/v1/route \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
     -d '{"origin":{"lat":49.28,"lng":-123.12},"destination":{"lat":49.26,"lng":-123.10}}'
   ```

---

## 8 — Update the Flutter App

In `lib/core/constants/api_config.dart`, update:

```dart
static const String baseUrl = 'https://errunds-backend-XXXXXXX-uc.a.run.app/api/v1';
```

Rebuild and deploy the app. All Routes API calls now go through your Cloud Run backend.

---

## 9 — (Optional) Custom Domain

1. Go to **Cloud Run → errunds-backend → Manage Custom Domains**.
2. Click **Add Mapping** → follow the DNS verification steps.
3. Update `baseUrl` in the Flutter app to your custom domain.

---

## Redeploying After Code Changes

Repeat **Step 5** (Cloud Shell build) then re-deploy from the Cloud Run console:

1. Go to **Cloud Run → errunds-backend → Edit & Deploy New Revision**.
2. Select the new image tag.
3. Click **Deploy**.
