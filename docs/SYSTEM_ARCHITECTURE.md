# System Architecture Documentation

**Application Name:** Ramdiri Library Portal (Digital Library Management System)  
**Target Institution:** PM SHRI Ramdiri +2 High School, Begusarai, Bihar, India  
**System Version:** v1.1.0 (Production Hardened)

---

## 1. System Overview

The **Ramdiri Library Portal** is an end-to-end, enterprise-grade Digital Library Management System engineered specifically for public educational institutions in India. It bridges traditional paper register library workflows with modern web technologies, providing instant multilingual cataloging, precision QR code generation, physical sticker printing (Oddy ST-24 label standard), automated book loans/returns, digital study material access, real-time analytics, and role-based portal security.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
+-----------------------------------------------------------------------------------+
|  [ Public Visitor Home ]   |   [ Student Portal ]    |   [ Librarian Dashboard ]  |
|  - Smart Multilingual Search  - Issued Books Track  - Complete Catalog Management|
|  - Gallery & Feedback    - Reserve / Request    - QR & Sticker PDF Generator |
|  - Digital Resources     - Download Materials   - Student Registry & Loans   |
+-----------------------------------------------------------------------------------+
                                         |
                                (HTTPS / REST API)
                                         v
+-----------------------------------------------------------------------------------+
|                                 SERVER / API LAYER                                |
+-----------------------------------------------------------------------------------+
|                            Express.js Application (/api)                          |
|  +--------------------+---------------------+--------------------+-------------+  |
|  | Auth & RBAC Guard  | Book Catalog API    | Loans & Issues API | Search Engine|  |
|  +--------------------+---------------------+--------------------+-------------+  |
|  | Student Engine     | Requests & Reserves | Feedback & Gallery | Database API|  |
|  +--------------------+---------------------+--------------------+-------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                 DATA & UTILITY LAYER                              |
+-----------------------------------------------------------------------------------+
|  [ MongoDB Atlas / Mongoose ORM ] <---> [ Server DB Persistence Engine ]          |
|  - Books, Students, IssueLogs, Requests, StudyMaterials, Feedback, Gallery        |
|                                                                                   |
|  [ Utilities & PDF Engines ]                                                      |
|  - searchUtils.ts (Devanagari, Roman Hindi, Fuzzy DDC Indexing)                   |
|  - jsPDF Engine (Oddy ST-24 64mm x 34mm 3x8 Grid Calibration)                     |
|  - QRCode Canvas Engine                                                           |
+-----------------------------------------------------------------------------------+
```

---

## 3. Frontend Architecture

- **Framework:** React 18+ with TypeScript & Vite
- **Styling Engine:** Tailwind CSS with Lucide React icons
- **State Management:** Reactive React hooks (`useState`, `useMemo`, `useEffect`) with debounced API synchronizers and immediate local cache invalidation.
- **Key Client Modules:**
  - `PublicHome.tsx`: Public portal with smart catalog discovery, gallery, reviews, and login modal.
  - `StudentModule.tsx`: Student scholar dashboard with active loan tracking, reservation requests, and downloadable PDF study materials.
  - `LibrarianModule.tsx`: Central librarian control room containing full book CRUD, student registry, walk-in book issues/returns, range request approvals, barcode scanner integration, and Oddy ST-24 sticker PDF generation.

---

## 4. Backend Architecture & REST API

- **Runtime:** Node.js with Express.js backend (`/server.ts` & `/api/app.ts`)
- **Middlewares:**
  - `express.json()` and `express.urlencoded()` for request payload parsing
  - CORS and security header management
  - Global Express fallback error handler catching unhandled exceptions and returning structured JSON errors (`{ success: false, error: "..." }`)
- **Authentication & RBAC:**
  - Role-based token guard for `librarian` and `student` roles
  - Credentials verified against hashed/salted database records
  - Password change engine with audit logging

---

## 5. Storage Engine & Database

- **Primary Database:** MongoDB Atlas (Mongoose schema mapping)
- **Fallback Persistence:** Unified `ServerDB` service (`server_db.ts`) providing resilient in-memory & file-system fallback when cloud database connection is offline.
- **Data Collections:**
  1. `books`: Book ID, Accession Number, Call Number, Book Number, Title, Author, Publisher, Subject, DDC Code, Total Copies, Available Copies, Shelf Location, Cover Image.
  2. `students`: Student ID/Roll, Name, Class, Section, Mobile, Email, Status, Books Issued Count.
  3. `issuelogs`: Log ID, Book ID, Student ID, Issue Date, Due Date, Return Date, Status (ISSUED/RETURNED/OVERDUE), Fine Amount.
  4. `requests`: Request ID, Student ID, Book ID, Request Date, Status (PENDING/APPROVED/REJECTED/HELD).
  5. `studymaterials`: Material ID, Title, Subject, Class, File URL/Blob, Upload Date.
  6. `feedback`: Review ID, Name, Role, Rating, Comment, Status (PENDING/APPROVED).
  7. `gallery`: Image ID, Title, Category, URL, Upload Date.

---

## 6. Universal Multilingual Search Engine (`searchUtils.ts`)

- **Multilingual Support:** Native Devanagari (Hindi) script, English, and Roman Hindi transliteration (e.g. searching "गोधूलि", "Godhuli", "Premchand", or "प्रेमचंद").
- **Multi-Field Deep Matching:**
  - Book Title / Devanagari Title
  - Accession Number & Book Number
  - Call Number & DDC Classification
  - Author & Publisher
  - Category, Subject, and Shelf Location
  - Description & ISBN
- **Fuzzy & Partial Match:** Handles whitespace normalization, case insensitivity, partial substrings, and DDC decimal codes.

---

## 7. Sticker PDF Generation Engine (Oddy ST-24 Calibration)

- **Sheet Specification:** Oddy ST-24 A4 Sticker Sheet
- **Page Layout:** A4 Portrait (210 mm × 297 mm)
- **Grid Structure:** 3 Columns × 8 Rows = 24 Stickers per page
- **Sticker Dimensions:** 64 mm × 34 mm
- **Margins & Gaps:**
  - Top Margin: 12 mm
  - Centered Left/Right Margin: 5 mm
  - Horizontal Inter-Sticker Gap: 1 mm
  - Vertical Inter-Sticker Gap: 1 mm
- **Printed Label Format:**
  ```
  ACC NO -   CS-001
  CALL NO -  823.91 TAN
  BOOK NO -  B-014
  SHELF -    #08
             [ QR CODE ]
  ```
- **Engine Technology:** `jsPDF` vector rendering engine with embedded QR code PNG data URLs.

---

## 8. Deployment & Security Architecture

- **Hosting:** Google Cloud Run container environment behind Nginx reverse proxy routing port 3000.
- **Security Protections:**
  - Input sanitization against MongoDB query injection ($gt, $where, etc.)
  - XSS escaping on text inputs
  - No secret keys exposed to browser assets
  - CORS header restriction
  - Environment variable configuration (`.env.example`)
