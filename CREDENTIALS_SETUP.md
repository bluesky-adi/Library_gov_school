# 🛡️ Ramdiri +2 High School Digital Library Management System Security & Authentication Configuration Guide

This guide details the security specifications, JWT configuration procedures, development credentials, and credential rotation workflow representing the Ramdiri Library application suite.

---

## 1. Initial Librarian Development Account
For development and administrative bootstrap purposes, one primary Librarian account is automatically seeded. Since we adhere strictly to the school safety code, **these credentials are never rendered on the public website, login modals, or guest interface panels.**

#### 🔑 Seeding Credentials:
* **Username**: `ramdiri_admin_roy`
* **Default Password**: `LibrarianSecureBegusarai2026!`

*Note: On server boot, a configuration file named `librarian_v2_credentials.json` is generated with these credentials. The password is secured instantly using salted BCrypt double-hashing algorithms, and the original plain-text values are never saved on the disk.*

---

## 2. Dynamic JWT Secret Configuration (`JWT_SECRET`)
To sign and authenticate JSON Web Tokens securely for session validation across logins, a dedicated `JWT_SECRET` is utilized.

### Where is it Stored?
1. **Local Development**: Stored directly in the `.env` configuration file in the project's root workspace directory.
   ```env
   # .env
   JWT_SECRET="YOUR_CUSTOM_SECURE_JWT_SECRET"
   ```
2. **Production Deployment**: Excluded from file check-ins and injected at runtime as an environment secret variable.

### How to Generate a Secure `JWT_SECRET`?
For highly secure signature guarantees, generate a cryptographically strong random string using the following development terminal command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Example Output:
`4d3f3f0e0cc7187ee02b85aef6fc59a8501da86af654ba2bd9cabece032a188f`

### Environment Configuration:

* **For Development**:
  1. Open or create the `.env` file at the root.
  2. Map: `JWT_SECRET="<YOUR_GENERATED_SECURE_HEX>"`
  3. The `dotenv` parser on the server will automatically bind this variable to `process.env.JWT_SECRET` during startups.

* **For Production (Cloud Run / AI Studio Deployment)**:
  1. Navigate to the **Secrets** or **Environment Settings** tab in your cloud management panel.
  2. Add a new variable with name `JWT_SECRET`.
  3. Enter your generated cryptographically secure hex string as the target value and apply the settings.

---

## 3. How to Rotate Chief Librarian Credentials Later
A dedicated credential rotation mechanism is engineered into the system. The librarian can freely change their administrative handle and passphrase directly inside their workstation view.

### Rotation Procedure:
1. Log in to the system using the active library credentials.
2. In the navigation tabs, click the **Security Controls** tab.
3. Enter your new desired administrative login username.
4. Input your **Current Password** to verify authorization validity.
5. Provide your **New Secure Password** and confirm it.
6. Click **Commit Credentials Update**.

Upon validation matching, the backend server updates the `librarian_v2_credentials.json` file instantly. The active password is encrypted using high-security salted BCrypt algorithms before completion.

---

## 4. How to Create Additional Librarian Accounts in the Future
While the government high school security framework designates a single high-security unified Chief Librarian workstation by default, the architecture is easily extendable to support multi-librarian accounts.

### Option A: Manual JSON Administration
To manually add more librarians without writing client-side forms:
1. Open the secure JSON config file on the server at `librarian_v2_credentials.json`.
2. Convert the schema from a single object to an array of librarian users:
   ```json
   [
     {
       "username": "ramdiri_admin_roy",
       "passwordHash": "$2a$10$..."
     },
     {
       "username": "assistant_librarian_devi",
       "passwordHash": "$2a$10$..."
     }
   ]
   ```
3. Generate the bcrypt hash for the secondary user's password using a node script:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('YourSecureAssis2026!', 10))"
   ```
4. Update the server authentication checks in `server.ts` to query the array instead of a single object (e.g., using `activeConfig.find(u => u.username === username)`).

### Option B: Database Extension (Recommended for Scale)
For a larger school scale:
1. Connect the Express server to a persistent database (like Firebase Firestore or Cloud SQL).
2. Create a secure collection or table named `librarians` structure containing: `username`, `password_hash`, `full_name`, and `status`.
3. Provide an "Add Assistant Librarian" panel inside the **Security Controls** tab, restricting write actions solely to the primary Administrator.

