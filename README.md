# Ramdiri Library Portal (v1.1.0)
### Digital Library Management System
**PM SHRI Ramdiri +2 High School, Begusarai, Bihar, India**

---

## 📚 Overview

The **Ramdiri Library Portal** is a production-grade, full-stack Digital Library Management System built with React, TypeScript, Express.js, and MongoDB. Engineered for educational institutions, it provides instant multilingual book cataloging (English, Devanagari Hindi, Roman Hindi), QR code sticker printing on standard **Oddy ST-24** label sheets, fast walk-in counter loan processing, online student reservations, and downloadable digital curriculum resources.

---

## 📖 Complete Documentation Suite

All system documentation is stored inside the [`/docs`](./docs) directory:

1. 🏗️ **[System Architecture (`docs/SYSTEM_ARCHITECTURE.md`)](./docs/SYSTEM_ARCHITECTURE.md)**
   - System overview, architecture diagrams, client/server modules, database engine, search pipeline, and security design.
2. 🗄️ **[Database Schema & REST API Reference (`docs/DATABASE_AND_API.md`)](./docs/DATABASE_AND_API.md)**
   - Complete schema specs for `books`, `students`, `issuelogs`, `requests`, `studymaterials`, `feedback`, and REST API endpoints.
3. 🛠️ **[Developer, Deployment & Operational Guide (`docs/DEVELOPER_AND_DEPLOYMENT_GUIDE.md`)](./docs/DEVELOPER_AND_DEPLOYMENT_GUIDE.md)**
   - Setup instructions, folder structure, build pipelines, Cloud Run container deployment, environment variables, and backup procedures.
4. 📘 **[Librarian User Manual (`docs/LIBRARIAN_USER_MANUAL.md`)](./docs/LIBRARIAN_USER_MANUAL.md)**
   - Step-by-step instructions for librarians: book cataloging, bulk CSV import, Oddy ST-24 QR sticker printing, walk-in counter loans, and student management.
5. 📊 **[Case Study & Social Impact Report (`docs/CASE_STUDY_AND_IMPACT.md`)](./docs/CASE_STUDY_AND_IMPACT.md)**
   - Problem statement, digital transformation story, before vs. after comparison, measured performance metrics, and engineering challenges solved.
6. 🛡️ **[Security & Configuration Guide (`docs/SECURITY_AND_CONFIGURATION.md`)](./docs/SECURITY_AND_CONFIGURATION.md)**
   - Security model, environment variable specifications, secret management, and administrative credential rotation workflows.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your configuration variables:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ramdiri_library
JWT_SECRET=<your_secure_random_jwt_secret>
INITIAL_LIBRARIAN_USERNAME=<configured_admin_username>
INITIAL_LIBRARIAN_PASSWORD=<configured_admin_password>
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Verify Production Code
```bash
npm run lint
npm run build
npm run start
```

---

## ✨ Key Features & Specifications

- **Oddy ST-24 Sticker PDF Engine:**
  - Standard A4 Sheet (210 mm × 297 mm)
  - 3 Columns × 8 Rows (24 Stickers / Page)
  - Sticker Dimensions: 64 mm × 34 mm (1 mm horizontal/vertical gaps)
  - Precision Labeling: `ACC NO -`, `CALL NO -`, `BOOK NO -`, `SHELF -` with embedded QR code.
- **Universal Multilingual Search Engine (`searchUtils.ts`):**
  - Instant Devanagari Hindi, English, and phonetic Roman Hindi query matching.
  - Multi-field scoring across title, author, publisher, DDC code, call number, shelf, and accession numbers.
- **Robust Security & Resilience:**
  - Role-based token authentication (Librarian, Student).
  - Global Express fallback error handling catching unhandled exceptions cleanly.
  - In-memory and disk persistence fallback ensuring 100% uptime even during database network hiccups.
