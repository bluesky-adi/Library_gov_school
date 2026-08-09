# Developer, Deployment & Maintenance Guide

**Application Name:** Ramdiri Library Portal  
**Document Type:** Engineering Operational Manual  
**Current System Version:** v1.1.0

---

## 1. Local Development Setup

### Prerequisites
- Node.js v18+ or v20+
- npm v9+ or Bun v1.0+
- MongoDB instance (local or MongoDB Atlas connection string)

### Step-by-Step Setup
1. Clone repository and navigate to root directory:
   ```bash
   git clone <repo-url>
   cd ramdiri-library-portal
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ramdiri_library
   JWT_SECRET=super-secret-key-for-ramdiri-library-2026
   GEMINI_API_KEY=your-gemini-api-key-if-applicable
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
   The application will run at `http://localhost:3000`.

---

## 2. Project Directory Structure

```
.
├── .env.example             # Template for required environment variables
├── metadata.json            # Application name, description & capabilities
├── package.json             # Build scripts and dependencies
├── server.ts                # Express backend launcher & Vite middleware wrapper
├── api/                     # Backend API modules
│   ├── app.ts               # Express API router & endpoint handlers
│   └── server_db.ts         # ServerDB persistence service (Mongoose + local backup)
├── src/                     # React Frontend Source
│   ├── main.tsx             # React DOM entry point
│   ├── App.tsx              # Application state container & view router
│   ├── index.css            # Tailwind CSS & print media stylesheets
│   ├── lib/                 # Utility engines
│   │   ├── searchUtils.ts   # Multilingual & Devanagari search algorithm
│   │   └── ddcUtils.ts      # Dewey Decimal Classification color mapping
│   └── components/          # UI View Components
│       ├── PublicHome.tsx   # Visitor portal & catalog discovery
│       ├── StudentModule.tsx# Student scholar portal
│       └── LibrarianModule.tsx# Librarian control room & Oddy ST-24 PDF engine
└── docs/                    # Technical documentation suite
```

---

## 3. Build & Deployment Commands

### Verification & Testing
- Run TypeScript type checks:
  ```bash
  npm run lint
  ```
- Perform production build:
  ```bash
  npm run build
  ```
  This executes `vite build` for client assets and `esbuild server.ts` to generate `dist/server.cjs`.

### Production Launch
- Start compiled production server:
  ```bash
  npm run start
  ```

---

## 4. Cloud Deployment (Cloud Run / Container Hosting)

The application includes container readiness out-of-the-box:
- Binds to `0.0.0.0` on port `3000` (or `process.env.PORT`).
- Static SPA fallback served via Express static middleware in production.
- Cloud Run service environment variables must be declared in Google Cloud Console or `vercel.json` / `fly.toml`.

---

## 5. Backup & Restore Strategy

1. **Manual Backup via Librarian Portal:**
   - Go to **Librarian Portal -> Database Management**.
   - Click **Download Complete JSON Backup**.
   - Generates a timestamped JSON file containing all books, students, logs, and requests.
2. **Database Restore:**
   - In **Database Management**, click **Restore Database from File**.
   - Select the backup `.json` file to restore full catalog records.
3. **Cloud Database Backups:**
   - MongoDB Atlas provides automated daily snapshots with point-in-time recovery.

---

## 6. Maintenance & Troubleshooting

- **Symptom: Database Status showing Disconnected.**
  - Check `MONGODB_URI` environment variable value. Ensure MongoDB IP Whitelist permits connections from `0.0.0.0/0`.
- **Symptom: Sticker PDF printing out of bounds on printer.**
  - Ensure printer dialog settings are set to **Scale: 100% (Actual Size)**, NOT "Fit to Printable Area". Oddy ST-24 calibration relies on 1:1 true scale.
- **Symptom: Missing TypeScript compiler errors.**
  - Run `npm install` to ensure `typescript` package is available in `node_modules`.
