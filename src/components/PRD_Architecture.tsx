/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BookOpen, Shield, Database, Cpu, FileSpreadsheet, CheckSquare, Layers, HelpCircle, HardDrive, Printer } from 'lucide-react';

export default function PRD_Architecture() {
  const [activeSec, setActiveSec] = useState<number>(1);

  const sections = [
    { id: 1, title: "1. PRD & Functional Specs", icon: BookOpen },
    { id: 2, title: "2. System & Stack Architecture", icon: Cpu },
    { id: 3, title: "3. Folder Structure & Maps", icon: Layers },
    { id: 4, title: "4. DB Design & MongoDB Schemas", icon: Database },
    { id: 5, title: "5. Mongoose Models Code", icon: HardDrive },
    { id: 6, title: "6. API Endpoints Catalog", icon: Shield },
    { id: 7, title: "7. Auth & Flow Visualizers", icon: CheckSquare },
    { id: 8, title: "8. Bulk Excel & Request Pipelines", icon: FileSpreadsheet },
    { id: 9, title: "9. Operations & Deployment Plan", icon: Printer },
    { id: 10, title: "10. Development Roadmap", icon: HelpCircle }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="prd-doc-container" className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[70vh]">
      {/* Sidebar for PRD Categories */}
      <div className="md:col-span-3 bg-slate-50 md:bg-slate-100/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
        <div className="p-3">
          <h3 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">
            Technical Blueprint
          </h3>
          <p className="text-xs text-slate-500 mt-1">20-Section Official Specifications</p>
        </div>
        
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSec(sec.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-all text-sm font-medium ${
                activeSec === sec.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{sec.title}</span>
            </button>
          );
        })}

        <div className="pt-4 px-2">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-750 dark:bg-slate-700 text-white text-xs border border-transparent rounded-md transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report / Export PDF
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-9 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-h-[80vh] overflow-y-auto style-scrollbar">
        {activeSec === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">1. Product Requirements Document (PRD) & High-Level Scope</h2>
              <p className="text-sm text-slate-500">Official Directives for Ramdiri +2 High School, Begusarai, Bihar</p>
            </div>

            <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">1.1 Project Objective</h4>
                <p className="mt-1">
                  To eliminate paper register files, messy Excel templates, and opaque book discovery at Ramdiri +2 High School. The solution establishes a professional, reliable, accessible digital library management center catering to 1,500+ students, teachers, librarians, and administrative state monitors.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">1.2 Core Target Users & Key Intended Outcomes</h4>
                <ul className="list-disc list-inside mt-1 pl-2 space-y-1">
                  <li><strong>Students:</strong> High-speed book exploration, intuitive book availability checks, simplified loan requests with immediate status transparency.</li>
                  <li><strong>Librarians:</strong> Instant inventory setup via bulk Excel uploader, barcode configuration prep, visual student rosters, and quick digital checkout/return state updates.</li>
                  <li><strong>Teachers:</strong> Class-wise reading patterns, reading matrices, check current active issues.</li>
                  <li><strong>Administrators:</strong> Comprehensive operation audit logs, system preferences, roles customization, database secure configurations.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">1.3 Key Constraints & Design Mandate</h4>
                <p className="mt-1">
                  Must align with public education parameters. Lightweight client resource payloads, bilingual interface (English + Hindi), high contrast toggle, screen reader friendly accessibility patterns, and fully printable tabular statistics reports without web-layout breakage.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSec === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">2. System Architecture & Tech Stack</h2>
              <p className="text-sm text-slate-500">How the Frontend, Backend, and Databases Interconnect</p>
            </div>

            <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded p-4">
                <h4 className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-2">SYSTEM INTERACTION LAYERS</h4>
                <pre className="text-xs font-mono bg-slate-950 text-emerald-500 p-3 rounded overflow-x-auto leading-normal">
{`+-------------------------------------------------------------+
|               USER INTERFACE (Vite + React)                  |
|  - English/Hindi UI   - Search (Fuse.js)   - Theme Toggle   |
+------------------------------+------------------------------+
                               |
                   HTTPS/JSON REST API Requests
                               |
+------------------------------v------------------------------+
|               EXPRESS BACKEND CONTROLLER LAYER               |
|  - JWT Authentication  - Excel Parser  - Route Middleware   |
+------------------------------+------------------------------+
                               |
                       Database Queries
                               |
+------------------------------v------------------------------+
|                   PERSISTENT STORAGE                        |
|  - MongoDB Atlas (Cloud) / Express JSON Local File Backup   |
+-------------------------------------------------------------+`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">2.1 Layer Responsibilities</h4>
                <ul className="list-decimal list-inside space-y-1 mt-1 pl-2">
                  <li><strong>Client-Side Layer (React 19 + Tailwind):</strong> Serves state-driven interface. Employs <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">Fuse.js</code> client-side search to guarantee immediate typo-tolerance without lag. Utilizing Tailwind v4 theme engines.</li>
                  <li><strong>APIs & Routing (Express 4):</strong> Serves endpoints for user authentication, token-verification, books directory manipulation, catalog excel extraction, and requests workflow.</li>
                  <li><strong>Data Model Mapping:</strong> Translates user requests directly into Mongoose schema standards, performing structured schema validations.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeSec === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">3. Complete Folder Structure</h2>
              <p className="text-sm text-slate-500">Source Tree Configuration</p>
            </div>

            <pre className="text-xs font-mono bg-slate-950 text-slate-200 p-4 rounded overflow-x-auto leading-relaxed">
{`ramdiri-digital-library/
├─ .env.example
├─ .gitignore
├─ index.html
├─ metadata.json
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ server.ts                 # Full Stack Custom Express Server
├─ src/
│  ├─ main.tsx               # Client Entrypoint
│  ├─ App.tsx                # Principal App State Manager & Local Routing
│  ├─ index.css              # Custom Tailwind & Variable Layouts
│  ├─ types.ts               # Complete Global TypeScript Enums & System Types
│  ├─ localization.ts        # Hindi + English Interface Mapping Dictionaries
│  ├─ data/
│  │  └─ initialData.ts      # Seed books (NCERT & BSTBPC), students & records
│  ├─ components/
│  │  ├─ PublicHome.tsx      # Principal message, statistics overview, school info
│  │  ├─ Header.tsx          # Bihar Government portal header, role switch, lang toggle
│  │  ├─ LibraryPortal.tsx   # Integrated dashboard based on active user role
│  │  └─ PRD_Architecture.tsx # Interactive Product Architect documentation center`}
            </pre>
          </div>
        )}

        {activeSec === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">4. Database Design & MongoDB Schemas</h2>
              <p className="text-sm text-slate-500">Logical Structure of Databases in MongoDB</p>
            </div>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Our structural database architecture utilizes four primary logical tables (organized as MongoDB Collections). Below is the Schema relationship and fields layout.
              </p>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">4.1 Collection: <code className="font-mono text-emerald-600 dark:text-emerald-400">books</code></h4>
                <table className="min-w-full text-xs mt-1 border border-slate-200 dark:border-slate-800 text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900">
                    <tr>
                      <th className="p-2 border-b">Field</th>
                      <th className="p-2 border-b">Type</th>
                      <th className="p-2 border-b">Constraints</th>
                      <th className="p-2 border-b">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b font-mono font-bold">bookId</td>
                      <td className="p-2 border-b">String</td>
                      <td className="p-2 border-b">Unique, Required, Index</td>
                      <td className="p-2 border-b">Primary identifier</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-mono font-bold">isbn</td>
                      <td className="p-2 border-b">String</td>
                      <td className="p-2 border-b">Unique, Index</td>
                      <td className="p-2 border-b">Barcoding / standard ISBN</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-mono font-bold">bookName</td>
                      <td className="p-2 border-b">String</td>
                      <td className="p-2 border-b">Required (Indexed)</td>
                      <td className="p-2 border-b">Full Title</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-mono font-bold">availableCopies</td>
                      <td className="p-2 border-b">Number</td>
                      <td className="p-2 border-b">Min: 0</td>
                      <td className="p-2 border-b">Copies on shelves</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">4.2 Collection: <code className="font-mono text-emerald-600 dark:text-emerald-400">students</code></h4>
                <p className="text-xs">Tracks physical student coordinates, Parent contact information to enable emergency tracking list and school roll lists.</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-200">4.3 Collection: <code className="font-mono text-emerald-600 dark:text-emerald-400">borrow_requests</code></h4>
                <p className="text-xs">Maintains request logs. Captures school class, roll numbers, request status ('Pending' | 'Approved' | 'Rejected' | 'Returned'), decision metrics.</p>
              </div>
            </div>
          </div>
        )}

        {activeSec === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">5. Complete Mongoose Models</h2>
              <p className="text-sm text-slate-500">Mongoose Code Ready for Database Execution</p>
            </div>

            <pre className="text-xs font-mono bg-slate-950 text-slate-200 p-4 rounded overflow-x-auto leading-relaxed">
{`import mongoose, { Schema } from 'mongoose';

// --- BOOK SCHEMA & MODEL ---
const BookSchema = new Schema({
  bookId: { type: String, required: true, unique: true },
  isbn: { type: String, required: true, unique: true },
  bookName: { type: String, required: true, index: true },
  author: { type: String, required: true },
  publisher: { type: String, required: true },
  edition: { type: String },
  publicationYear: { type: Number, required: true },
  category: { type: String, enum: ['Academic', 'General'], required: true },
  subject: { type: String, required: true },
  language: { type: String, required: true },
  schoolClass: { type: String, required: true },
  shelfLocation: { type: String, required: true },
  totalCopies: { type: Number, default: 1 },
  availableCopies: { type: Number, default: 1 },
  coverImage: { type: String },
  description: { type: String },
  status: { type: String, default: 'Available' }
}, { timestamps: true });

export const BookModel = mongoose.model('Book', BookSchema);

// --- STUDENT SCHEMA & MODEL ---
const StudentSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  schoolClass: { type: String, required: true },
  section: { type: String, required: true },
  rollNumber: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phoneNumber: { type: String, required: true },
  parentName: { type: String, required: true },
  parentContact: { type: String, required: true },
  booksIssuedCount: { type: Number, default: 0 },
  booksReturnedCount: { type: Number, default: 0 }
}, { timestamps: true });

export const StudentModel = mongoose.model('Student', StudentSchema);`}
            </pre>
          </div>
        )}

        {activeSec === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">6. API Endpoints Catalog</h2>
              <p className="text-sm text-slate-500">REST Endpoints serving the Digital Core</p>
            </div>

            <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900">
                <span className="font-mono text-emerald-600 font-bold mr-2">POST</span>
                <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">/api/auth/login</code>
                <p className="text-xs mt-1 text-slate-500">User Login. Performs database credentials matching. Generates JWT back to bearer token.</p>
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900">
                <span className="font-mono text-blue-600 font-bold mr-2">GET</span>
                <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">/api/books</code>
                <p className="text-xs mt-1 text-slate-500">Fetches all books. Supports search params like title, author, class filter.</p>
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900">
                <span className="font-mono text-emerald-600 font-bold mr-2">POST</span>
                <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">/api/books/request</code>
                <p className="text-xs mt-1 text-slate-500">Submits borrow request. Checks inventory availability score.</p>
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900">
                <span className="font-mono text-purple-600 font-bold mr-2">PUT</span>
                <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">/api/books/request/:id/approve</code>
                <p className="text-xs mt-1 text-slate-500">Requires Librarian Auth. Approves and decrements the availableCopies inside the database.</p>
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900">
                <span className="font-mono text-emerald-600 font-bold mr-2">POST</span>
                <code className="font-mono font-semibold text-slate-900 dark:text-slate-100">/api/books/excel-upload</code>
                <p className="text-xs mt-1 text-slate-500">Multer secure endpoint accepting multipart excel spreadsheets, parses inside memory using XLSX and appends to inventory.</p>
              </div>
            </div>
          </div>
        )}

        {activeSec === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">7. Authentication & Authorization Flows</h2>
              <p className="text-sm text-slate-500">Role-Based Security Pipelines</p>
            </div>

            <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg space-y-2">
                <h4 className="font-bold text-amber-900 dark:text-amber-400 text-xs uppercase tracking-wider font-mono">
                  🚨 SECURE DEVELOPMENT-ONLY SYSTEM CREDENTIALS
                </h4>
                <p className="text-xs text-slate-650">
                  Per strict security mandates, administrative credentials must never be displayed publicly, on the login screens, or inside open user facing modules. These system defaults can only be referenced inside this technical documentation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-900 border rounded font-mono">
                    <span className="font-bold text-[10px] text-slate-500 block uppercase">1. SECURE LIBRARIAN USER</span>
                    <span className="block mt-1">Username: <b className="text-slate-900 dark:text-white select-all">ramdiri_admin_roy</b></span>
                    <span className="block">Password: <span className="text-slate-500 italic">Managed securely via environment variables (refer to .env.example)</span></span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border rounded font-mono">
                    <span className="font-bold text-[10px] text-slate-500 block uppercase">2. SEED STUDENT USER</span>
                    <span className="block mt-1">Roll Number: <b className="text-slate-900 dark:text-white select-all">12</b></span>
                    <span className="block">Date of Birth: <b className="text-slate-900 dark:text-white select-all">2010-05-15</b></span>
                    <span className="block text-[10px] text-slate-400 italic">(Scholar: Aashish Kumar Dinkar)</span>
                  </div>
                </div>
              </div>

              <p>
                To ensure robust isolation, we execute a token-based secure passporting flow. Below is the visual representation of the verification gate:
              </p>

              <pre className="text-xs font-mono bg-slate-950 text-emerald-500 p-4 rounded overflow-x-auto leading-relaxed">
{`[ STUDENT / LIBRARIAN CLIENT ] ---( Credentials )---> [ /api/auth/login ]
                                                            |
                                                   Generates JWT Token
                                                    (Signed with school Key)
                                                            |
[ Protected API Requests ]  <---( Bearer Token )-----------+

                            +-------------------------------+
                            |     EXPRESS SECURITY GAUNTLET  |
                            |                               |
                            |   - Verifies JWT Signature    |
                            |   - Binds payload to req.user |
                            |   - Restricts librarian       |
                            |     actions via custom roles  |
                            +-------------------------------+`}
              </pre>

              <p className="text-xs">
                Students can only view records and issue requests. Teachers can access macro statistics but cannot delete inventory. Librarians hold complete catalog write access.
              </p>
            </div>
          </div>
        )}

        {activeSec === 8 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">8. Bulk Excel & Request Pipeline</h2>
              <p className="text-sm text-slate-500">How XLS/XLSX Files and Checkouts are Handled</p>
            </div>

            <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
              <h4 className="font-semibold text-slate-900 dark:text-slate-200">8.1 Bulk Excel Import Flow</h4>
              <p className="text-xs">
                Rather than forcing manual registration for 1000s of pre-existing books, the librarian simply uploads <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">books.xlsx</code>.
              </p>
              <ul className="list-decimal list-inside text-xs space-y-1 pl-2">
                <li>Librarian drags spreadsheet onto the dropzone.</li>
                <li>Express backend uses Node package <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">xlsx</code> to extract raw rows.</li>
                <li>Database validation monitors columns: Class range mapping (Class 6-12), category separation, checks for duplicate ISBN entries.</li>
                <li>Valid entries are saved in batch transaction, sending an interactive success notification callback.</li>
              </ul>

              <h4 className="font-semibold text-slate-900 dark:text-slate-200 mt-4">8.2 Request Borrowing Workflow</h4>
              <p className="text-xs">
                To keep physical inventory intact, students cannot reserve directly. They trigger a Request. The librarian is instantly alerted inside their portal's "Pending Requests" table. With a click, the librarian issues or rejects the reservation, printing a receipt label directly to guide shelving location layout lookup.
              </p>
            </div>
          </div>
        )}

        {activeSec === 9 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">9. Operations & Security Deployment Plan</h2>
              <p className="text-sm text-slate-500">Deploying on Secure Vercel and render environments</p>
            </div>

            <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200">9.1 Deployment Targets</h4>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  <li><strong>Frontend Client:</strong> Configured for deployment on Vercel with automatic asset compression.</li>
                  <li><strong>Backend API:</strong> Deployed on Render container nodes with environment variables for database keys.</li>
                  <li><strong>Database Layer:</strong> MongoDB Atlas database hosted on Azure / AWS clusters inside Indian state region (Mumbai) for minimum network lag of Bihar schools.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200">9.2 Backup & Disaster Recovery (DR) Strategy</h4>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  <li><strong>Daily automated snapshots:</strong> Daily cron backup of MongoDB Atlas cluster data.</li>
                  <li><strong>Librarian Backup Controls:</strong> Fully styled interface allows the active librarian of Ramdiri school to instantly download a compiled JSON layout containing books catalog, student database arrays, and transaction audit trails for local machine preservation.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeSec === 10 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">10. 20-Step Development Roadmap</h2>
              <p className="text-sm text-slate-500">Comprehensive Engineering Path to Implementation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3 border border-slate-200 dark:border-slate-800 rounded">
                <span className="font-bold text-emerald-600 block">PHASE A: Initialization & Config</span>
                <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Initialize vite typescript compilation bounds.</li>
                  <li>Configure tailwindcss variable styles.</li>
                  <li>Establish global system metadata and roles.</li>
                  <li>Establish localization maps (EN/HI).</li>
                  <li>Verify offline-first fail-safes.</li>
                </ol>
              </div>

              <div className="space-y-2 p-3 border border-slate-200 dark:border-slate-800 rounded">
                <span className="font-bold text-emerald-600 block">PHASE B: Database & Schema Binding</span>
                <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-600 dark:text-slate-400" start={6}>
                  <li>Draft Mongoose database Schemas.</li>
                  <li>Produce initial datasets matching Bihar Board.</li>
                  <li>Bind Express backend ports to port 3000.</li>
                  <li>Execute server file upload middleware (Multer).</li>
                  <li>Run xlsx parsing libraries test cases.</li>
                </ol>
              </div>

              <div className="space-y-2 p-3 border border-slate-200 dark:border-slate-800 rounded">
                <span className="font-bold text-emerald-600 block">PHASE C: Frontend & Fuzzy Searching</span>
                <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-600 dark:text-slate-400" start={11}>
                  <li>Build government-grade layout theme.</li>
                  <li>Integrate public home + Principal's message.</li>
                  <li>Setup Fuse.js smart typo-tolerant index.</li>
                  <li>Create interactive Student book explorer.</li>
                  <li>Implement digital checkout request workflow.</li>
                </ol>
              </div>

              <div className="space-y-2 p-3 border border-slate-200 dark:border-slate-800 rounded">
                <span className="font-bold text-emerald-600 block">PHASE D: Administration, Exports & Audits</span>
                <ol className="list-decimal list-inside pl-1 space-y-1 text-slate-600 dark:text-slate-400" start={16}>
                  <li>Code Librarian Pending Request approvals view.</li>
                  <li>Establish Teacher analytical reading matrix.</li>
                  <li>Incorporate fine calculation & overdue alerts.</li>
                  <li>Establish PDF-friendly print stylesheet.</li>
                  <li>Initiate end-to-end linting checks.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
