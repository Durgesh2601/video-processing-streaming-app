# Video Processing Streaming App

A frontend-heavy full-stack video operations platform built for the assignment requirements in the provided PDF. It includes tenant-aware authentication, role-based access, video uploads, simulated processing with live updates, sensitivity classification, search and filtering, and byte-range video streaming for browser playback.

## Stack

- React + Vite + TypeScript
- Express + TypeScript
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- Multer-based local upload storage

## Core Features

- Multi-tenant workspace isolation by organization
- JWT-based authentication and protected APIs
- Role-based permissions for `admin`, `editor`, and `viewer`
- Video upload flow with metadata capture
- Real-time processing progress via Socket.IO
- Sensitivity classification as `pending`, `safe`, or `flagged`
- Search and filter controls across video inventory
- Browser-friendly video streaming with HTTP range requests
- Admin review actions to override sensitivity state
- Frontend-heavy operations dashboard with upload, review, and preview in one screen

## What It Covers

- Multi-tenant data isolation by organization
- Role-based access control for `admin`, `editor`, and `viewer`
- Registration and login flows
- Upload and processing lifecycle tracking
- Real-time dashboard refresh for processing progress
- Sensitivity states: `pending`, `safe`, `flagged`
- Search, status filters, and safety filters
- Browser video playback with range request support
- Admin-only sensitivity override actions

## Project Structure

```text
.
├── client
│   ├── src
│   │   ├── context
│   │   ├── pages
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── styles.css
├── server
│   ├── src
│   │   ├── lib
│   │   ├── middleware
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   └── index.ts
├── package.json
└── tsconfig.base.json
```

## Local Setup

### Prerequisites

- Node.js 18+
- npm 10+
- MongoDB Atlas connection string or local MongoDB instance

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create the env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update `server/.env`:

```bash
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-strong-secret
MONGODB_URI=your-mongodb-uri
UPLOAD_DIR=./uploads
```

Update `client/.env`:

```bash
VITE_API_URL=http://localhost:4000
```

### 3. Start the app

Run frontend and backend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:server
npm run dev:client
```

### 4. Open the app

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/health`

## User Walkthrough

### 1. Register or login

- Create an account with a name, email, password, and organization name
- The first user created for an organization is automatically assigned the `admin` role
- Later users can join with `viewer` or `editor` access

### 2. Access the operations dashboard

- After login, the user lands on a single dashboard containing:
  - video library
  - preview/player area
  - organization stats
  - upload form for `admin` and `editor`

### 3. Upload a video

- Add title and description
- Select a video file
- Submit the upload
- A new item appears in the library with processing progress

### 4. Track processing in real time

- The backend simulates a processing pipeline
- Socket.IO emits updates to connected users in the same organization
- The UI refreshes status, progress, and safety state without page reloads

### 5. Review and stream content

- Select any video from the library to open the preview panel
- The video player streams the file with byte-range support
- The duration shown in the UI is read from actual browser video metadata
- Admins can override sensitivity state directly from the preview panel

### 6. Filter library content

- Search by title, description, or uploader
- Filter by processing status
- Filter by sensitivity category

## Architecture Notes

### High-level design

- The application is split into a React client and an Express server
- MongoDB stores users and video metadata
- Local disk stores uploaded media files
- Socket.IO is used for tenant-scoped real-time processing updates
- JWT is used for stateless authentication across REST and socket connections

### Backend architecture

- `routes/`
  - `auth.ts` handles registration, login, and current-user lookup
  - `videos.ts` handles upload, listing, filtering, review actions, and streaming
- `models/`
  - `User` stores account, role, and organization data
  - `Video` stores metadata, processing state, sensitivity state, and tags
- `services/`
  - `processor.ts` simulates the asynchronous processing lifecycle and emits socket updates
- `middleware/`
  - auth and role guards protect restricted routes
- `lib/`
  - Mongo connection setup
  - Socket.IO initialization

### Frontend architecture

- `AuthContext` stores auth state and token lifecycle
- `AuthPage` handles register/login flows
- `DashboardPage` is the main operational surface
- `api.ts` centralizes HTTP client configuration
- `styles.css` contains the custom responsive design system

### Request and update flow

1. User authenticates and receives a JWT
2. Client stores token and uses it for API requests
3. Upload creates a new `Video` record and stores the file on disk
4. Processing service updates progress and sensitivity
5. Socket.IO emits updates to the user’s organization room
6. Client refreshes library state and preview details
7. Video player streams content from the range-enabled endpoint

## Assumptions

- The app is intended for assignment/demo use rather than large-scale production traffic
- Each user belongs to a single organization
- Organization membership is inferred from the organization name entered during registration
- Uploaded files are stored on the same server instance
- Sensitivity analysis is represented as a lightweight simulation instead of a real ML pipeline
- Browser video metadata can be used as the most reliable display duration in the current build

## Tradeoffs

- Real video processing was intentionally simulated to keep the implementation focused on full-stack workflow, realtime coordination, and UX
- Local disk storage is simpler than cloud storage and is enough for assignment delivery, but would not be ideal for horizontal scaling
- The upload/processing pipeline runs in-process instead of a dedicated worker queue to reduce infrastructure complexity
- Organization onboarding is simplified and does not include invite flows or admin approval
- Search is implemented through MongoDB regex-based filtering instead of a dedicated search engine
- Duration persistence on the backend remains approximate during processing; the preview UI shows the actual media duration from the browser player

## Security Notes

- Passwords are hashed with `bcryptjs`
- JWT protects authenticated API access
- Role checks restrict upload and moderation actions
- Organization scoping is applied to video reads and writes
- Streaming endpoints also require authentication

## Responsiveness

- The UI uses custom CSS with Grid and Flexbox rather than a styling framework
- Major layouts collapse from multi-column to single-column at tablet/mobile breakpoints
- Filters, tags, actions, and stat cards wrap to avoid overflow
- The video player uses a fixed aspect ratio for predictable scaling

## Build

```bash
npm run build
```

## Future Improvements

- Replace simulated processing with FFmpeg and `ffprobe`
- Move uploads to cloud object storage such as S3 or Cloudinary
- Add background jobs with BullMQ or a similar queue system
- Add invite-based organization management
- Persist true media duration and richer metadata server-side
- Add automated test coverage for auth, upload, filtering, and streaming

## Suggested Incremental Commit Sequence

1. `chore: scaffold monorepo workspaces`
2. `feat: add backend video processing and streaming APIs`
3. `feat: build frontend dashboard and project docs`
4. `chore: keep client build outputs out of source control`
