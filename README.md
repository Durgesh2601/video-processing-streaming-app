# Video Processing Streaming App

A frontend-heavy full-stack video operations platform built for the assignment requirements in the provided PDF. It includes tenant-aware authentication, role-based access, video uploads, simulated processing with live updates, sensitivity classification, search and filtering, and byte-range video streaming for browser playback.

## Stack

- React + Vite + TypeScript
- Express + TypeScript
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- Multer-based local upload storage

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
├── server
├── package.json
└── tsconfig.base.json
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start MongoDB locally or point to MongoDB Atlas.

3. Copy env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

4. Run the app:

```bash
npm run dev
```

5. Open the frontend at `http://localhost:5173`.

## Notes

- The first user created for an organization is automatically promoted to `admin`.
- Video processing is simulated for assignment flow coverage, but the architecture leaves room for an FFmpeg-backed worker.
- Uploaded files are stored locally in `server/uploads`.

## Build

```bash
npm run build
```

## Suggested Incremental Push Sequence

1. `chore: scaffold monorepo with client and server workspaces`
2. `feat: add backend auth, rbac, uploads, processing, and streaming APIs`
3. `feat: build frontend auth flow and video operations dashboard`
4. `docs: add setup guide and project overview`
