# TripMate – Smart Trip Planner & Travel Organizer

> **Plan Smarter. Pack Better. Travel Happier.**

TripMate is a full-stack travel planning and organizer platform built with React, TypeScript, Tailwind CSS, Express.js, Firebase Cloud Firestore & Authentication, Google Gemini AI, Google Maps Platform, and Open-Meteo Live Weather.

---

## Core Capabilities

- **Public Landing & Destination Discovery**: 11-section landing showcase, public destination explorer with interactive Google Maps (`@vis.gl/react-google-maps`), category filtering, and wishlist bookmarking.
- **Authentication & RBAC**: Firebase Email/Password, Google Sign-In, Forgot Password / Reset, Profile editing, Password updates, and Protected User/Admin routes (`USER` and `ADMIN` roles).
- **Personalized Dashboard**: Real-time Firestore-backed trip counts, packing completion, upcoming activities, budget analytics (Recharts), and smart notifications.
- **Trip Lifecycle & Collaborative Planning**: Create, edit, duplicate, archive, and delete trips; invite collaborators by email, accept/reject invitations, propose & vote on group destinations, and post shared trip notes.
- **Smart Packing Checklist & AI Packing Assistant**: 36 default items across 5 categories (`Clothing`, `Personal Care`, `Travel Essentials`, `Health & Safety`, `Electronics`), custom categories, unpacked essential warnings, reusable templates, trip list duplication, and Gemini AI climate-aware recommendations.
- **Daily Itinerary Planner**: Timeline, Calendar, and List views with date-range validation, chronological sorting, transit notes, and reordering.
- **Budget & Expense Tracker**: Multi-currency expense tracking across 8 categories, Recharts BarChart & PieChart analytics, and automatic overspend warnings.
- **Private Travel Document Vault**: Server-authenticated document upload (`POST /api/uploads`), access-checked preview & download (`GET /api/uploads/:fileId`), and deletion (`DELETE /api/uploads/:fileId`).
- **Live Weather & Travel Conditions**: Real-time Open-Meteo 7-day forecast, humidity, wind, rain probability, and weather-based packing guidance.
- **AI Travel Assistant**: Conversational Gemini assistant with active trip context and structured multi-day itinerary generation saved directly into Firestore.
- **Trip Journal & Admin Console**: Photo-supported travel memories and an Admin governance console for user roles, destination moderation, and content reports.

---

## REST API Documentation

All private API routes require an `Authorization: Bearer <Firebase_ID_Token>` header verified by `firebase-admin`.

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health check and Gemini configuration status |
| `GET` | `/api/weather?destination=...` | Public | Live geocoding + 7-day Open-Meteo forecast & packing tips |
| `POST` | `/api/ai/packing-suggestions` | Bearer Auth | Generates structured Gemini packing recommendations |
| `POST` | `/api/ai/chat` | Bearer Auth | Conversational travel guidance with optional trip context |
| `POST` | `/api/ai/generate-itinerary` | Bearer Auth | Generates structured multi-day itinerary activities |
| `POST` | `/api/uploads` | Bearer Auth | Stores private PDF/image/text attachment (max 5 MB) |
| `GET` | `/api/uploads/:fileId` | Bearer Auth | Streams file only to owner, authorized trip members, or admin |
| `DELETE` | `/api/uploads/:fileId` | Bearer Auth | Deletes stored attachment if caller is authorized |

---

## Firestore Collections & Security

- `users/{uid}`, `admins/{uid}`
- `trips/{tripId}` + `trips/{tripId}/members/{memberId}`
- `packingItems/{itemId}`, `packingTemplates/{templateId}`
- `activities/{activityId}`, `expenses/{expenseId}`, `travelDocuments/{docId}`
- `destinations/{destId}`, `savedDestinations/{savedId}`
- `notifications/{notificationId}`, `invitations/{invitationId}`
- `destinationVotes/{voteId}`, `tripNotes/{noteId}`, `journalEntries/{entryId}`, `reports/{reportId}`

All collections are protected by `/firestore.rules` (linted via `@firebase/eslint-plugin-security-rules`) enforcing `request.auth != null`, ownership/member checks, verified email checks for invitations/admin bootstrap, payload size bounds, and field validation.

---

## Environment Setup & Deployment

1. **Environment Variables** (see `.env.example`):
   - `GEMINI_API_KEY`: Server-side Gemini API key.
   - `VITE_GOOGLE_MAPS_API_KEY`: Browser Google Maps Platform key (restricted by HTTP referrer in production).
   - `APP_URL`: Hosted application URL.
2. **Firebase Console Step**:
   - Google Sign-In is enabled by default. To enable Email & Password registration/login, enable **Email/Password** in Firebase Console -> **Authentication -> Sign-in method**.
3. **Local Development**:
   ```bash
   npm install
   npm run dev
   ```
4. **Production Build & Start**:
   ```bash
   npm run build
   npm start
   ```
5. **Deploy to Google Cloud Run**:
   ```bash
   gcloud run deploy tripmate \
     --source . \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production" \
     --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
   ```
