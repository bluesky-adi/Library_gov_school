# 🛡️ System Security & Configuration Guide

This document details the security model, authentication configuration, secret management, environment variables, and credential rotation procedures for the Digital Library Management System.

---

## 1. Security Architecture & Principles

The application implements defense-in-depth security across all architectural layers:

* **Zero Hardcoded Secrets**: All sensitive tokens, database connection strings, and system credentials are supplied strictly via environment variables.
* **Salted Password Hashing**: Passwords are saved only after being hashed with salted BCrypt (`bcryptjs`) routines. Plain-text passphrases are never written to disk or database logs.
* **Stateless JWT Authentication**: Client sessions are verified using signed JSON Web Tokens (`jsonwebtoken`) with standardized expiry durations.
* **Role-Based Access Control (RBAC)**: Distinct permissions for `Librarian` (Administrative CRUD, Loan Counters, Student Registry) and `Student` (Loan History, Resource Downloads, Catalog Reservations).
* **Database Query Protection**: Input fields passed to MongoDB queries are sanitized against operator injection attacks (such as `$gt`, `$where`, or `$regex` exploits).

---

## 2. Environment Configuration

To configure the application for local development or production deployment, define the following environment variables:

| Environment Variable | Description | Example / Placeholder | Required |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Secret key used to sign and verify JWT authentication tokens | `<your_secure_random_jwt_secret>` | Yes |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<db_user>:<db_password>@cluster.mongodb.net/ramdiri_library` | Optional (In-memory fallback available) |
| `INITIAL_LIBRARIAN_USERNAME` | Initial administrative handle generated at bootstrap | `<configured_admin_username>` | Optional |
| `INITIAL_LIBRARIAN_PASSWORD` | Initial administrative passphrase used during initial setup | `<configured_admin_password>` | Optional |
| `GEMINI_API_KEY` | Server-side API key for AI assistant features | `<your_gemini_api_key>` | Optional |
| `PORT` | Listening port for Express application server | `3000` | Optional (Default: 3000) |
| `NODE_ENV` | Operating environment (`development` or `production`) | `production` | Optional |

---

## 3. Local Development Setup

1. Copy `.env.example` to create a local `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your development values using secure placeholders:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=<your_secure_random_jwt_secret>
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ramdiri_library
   INITIAL_LIBRARIAN_USERNAME=<configured_admin_username>
   INITIAL_LIBRARIAN_PASSWORD=<configured_admin_password>
   ```
3. Generate a cryptographically secure `JWT_SECRET` locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

*Note: The `.env` file is excluded from source control via `.gitignore`. Never commit actual `.env` files or credentials to Git repositories.*

---

## 4. Production Security & Secrets Management

When deploying to Cloud Run, container environments, or production infrastructure:

* **Runtime Secret Injection**: Inject `JWT_SECRET`, `MONGODB_URI`, and `GEMINI_API_KEY` as environment secrets in your Cloud Console / CI/CD secret manager.
* **Database Network Access**: Restrict MongoDB Atlas Network Access IP Whitelists to trusted service subnets or container origins where possible.
* **HTTPS Protocol Enforcement**: Ensure all traffic is routed through TLS/SSL (HTTPS) termination layers in reverse proxy / ingress configurations.

---

## 5. Administrative Credential Management & Rotation

The application includes built-in credential management and passphrase rotation capabilities:

1. Authenticate using active administrative credentials.
2. Navigate to **Security Controls** in the Librarian control panel.
3. Supply current administrative password to verify authorization.
4. Input the new desired username and passphrase.
5. Submit the update request.

Upon validation, the backend re-hashes the new passphrase with BCrypt and updates the active configuration store instantly.

---

## 6. Contributor & Repository Security Guidelines

* **Secret Scanning**: Run automated secret detection before committing changes.
* **No Inline Credentials**: Never hardcode API keys, passwords, database URIs, or JWT secrets in source code files (`.ts`, `.tsx`, `.js`, `.json`, `.md`).
* **Clean Commits**: Ensure build artifacts (`dist/`), environment files (`.env`), temporary export logs, and local configuration files remain untracked.
