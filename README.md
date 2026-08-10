# Ramdiri Library Portal

### Digital Library Management System

A production digital library system built for **PM SHRI Ramdiri +2 High School, Begusarai, Bihar**.

The portal replaces a large part of the library's paper-based catalogue and lending workflow with a searchable digital catalogue, student access, librarian tools, book circulation, reservations, QR-based identification, and digital study resources.

## Why this project exists

The library previously relied heavily on handwritten registers for catalogue management, book issues and returns, and student records.

Simple questions such as "Is this book available?" could require manually checking registers or shelves. Processing a loan also meant writing the same information into physical records.

The goal of the project was not to build a generic library demo. It was to build something that could actually work in the school's day-to-day environment.

That meant designing around real constraints:

* unreliable or limited connectivity
* a non-technical primary operator
* students using different languages and search styles
* thousands of catalogue records
* physical QR sticker printing
* simple workflows that could be used at the library counter

## Current deployment

The system was deployed to production in July 2026.

The project documentation records the following production state:

* **2,804 books** digitized
* **627 students** registered
* **83 active loans**
* **2 digital resources** available through the portal

These figures come from the production system and change as the library continues to operate.

## What the system provides

### Student portal

Students can:

* search the library catalogue
* check book availability
* view issued books
* view borrowing history
* request books
* access available digital study resources

### Librarian portal

The librarian can:

* manage the book catalogue
* add, edit and remove records
* manage students
* process walk-in issues and returns
* review and process book requests
* manage digital resources
* generate QR-based book labels
* import catalogue data in bulk
* review library activity

### Multilingual search

The search system is designed for the way students actually search rather than assuming perfectly formatted queries.

It supports:

* English
* Devanagari Hindi
* Roman Hindi / phonetic Hindi
* partial matches
* author and publisher searches
* DDC and call-number searches
* accession and book-number searches
* shelf and category fields

For example, a Hindi title can be searched using either Devanagari or a Romanized form where supported by the search pipeline.

### QR and physical sticker generation

The library uses **Oddy ST-24** A4 sticker sheets.

The portal generates printable labels containing:

* accession number
* call number
* book number
* shelf information
* QR code

The PDF generator was calibrated around the physical sticker dimensions rather than treating the output as a generic PDF.

The current layout uses a 3 × 8 grid of 24 labels per A4 page with 64 mm × 34 mm sticker dimensions.

### Bulk catalogue import

Thousands of catalogue records do not need to be entered manually.

The system supports spreadsheet-based catalogue import with validation before records are added to the catalogue.

### Authentication and access control

The application separates librarian and student capabilities through role-based authentication.

Authentication uses token-based sessions and password hashing, with secrets supplied through environment configuration rather than committed source files.

## Engineering decisions

### Search was designed around real users

A conventional exact-match search was not enough.

Students may search using:

* incomplete titles
* spelling variations
* English
* Hindi
* Romanized Hindi
* author names
* classification numbers

The search pipeline therefore combines normalization, partial matching and multi-field scoring to make catalogue discovery more forgiving.

### Physical printing mattered

One of the less obvious engineering problems was QR label printing.

A PDF can look correct on a screen and still print incorrectly on a physical sticker sheet because of browser margins, printer scaling and small layout differences.

The sticker generator was calibrated around the actual Oddy ST-24 dimensions and the project documentation includes printing guidance for maintaining 1:1 scale.

### The librarian is the primary operator

The system is designed around the person who actually has to use it every day.

That influenced:

* navigation
* terminology
* number of steps in common workflows
* issue and return flows
* catalogue management
* error handling
* bulk operations

The goal is not to maximize the number of features. It is to make common library work faster and less error-prone.

## Technology

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Lucide React

### Backend

* Node.js
* Express.js
* TypeScript

### Data and services

* MongoDB / Mongoose
* Fuse.js
* JSON Web Tokens
* bcryptjs
* jsPDF
* QRCode
* XLSX

### Development and deployment

* npm
* TypeScript
* esbuild
* Vite
* Environment-based configuration

Deployment details are documented separately because the production setup is environment-specific.

## Repository structure

```text
.
├── api/          # Backend API and persistence services
├── src/          # React application
├── docs/         # Technical and operational documentation
├── server.ts     # Application server
├── package.json
└── vite.config.ts
```

## Documentation

The repository includes separate documentation for different audiences:

* [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
* [Database & API Reference](./docs/DATABASE_AND_API.md)
* [Developer & Deployment Guide](./docs/DEVELOPER_AND_DEPLOYMENT_GUIDE.md)
* [Librarian User Manual](./docs/LIBRARIAN_USER_MANUAL.md)
* [Case Study & Impact](./docs/CASE_STUDY_AND_IMPACT.md)

The documentation covers the architecture, database model, API, deployment, operational workflows and the project's real-world implementation story.

## Development

### Requirements

* Node.js 18+
* npm
* MongoDB or a configured MongoDB Atlas connection

### Setup

Clone the repository and install dependencies:

```bash
npm install
```

Create a local `.env` file using `.env.example` and provide the required environment variables.

Example:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secure-random-secret>
```

Start the development server:

```bash
npm run dev
```

For a production build:

```bash
npm run lint
npm run build
npm run start
```

## Project status

The portal is in active production use and continues to be improved based on operational requirements and feedback from the school.

The repository therefore contains both the current implementation and documentation of decisions made during deployment and iteration.

## What I learned

The most useful part of this project has been learning that production software is less about adding features and more about dealing with constraints.

A feature that looks simple in a demo can become a very different engineering problem when:

* the internet connection is unreliable
* the operator is not a developer
* thousands of records already exist
* printed output has to align with physical stickers
* users search in multiple scripts
* a small workflow change affects a real person using the system

Building and iterating on the portal has been an exercise in turning those constraints into software decisions.

## Roadmap

Planned work includes:

* further performance and reliability improvements
* improved operational analytics
* additional librarian workflow improvements
* expanded digital resource support
* mobile-oriented workflows where they provide clear value
* potential multi-school support in the future

The roadmap is intentionally separate from the features currently deployed.

---

**Built for a real library, shaped by real usage, and still being improved.**
