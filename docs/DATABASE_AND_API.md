# Database Schema & REST API Reference

**Application Name:** Ramdiri Library Portal  
**Document Type:** Technical API & Database Specification  
**Version:** v1.1.0

---

## Part 1: Database Collections & Entity Schema

### 1. `books` Collection
| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `_id` / `bookId` | String | Primary Key, Unique | Accession Number / Primary Book ID |
| `accessionNumber`| String | Indexed | Physical Accession Number (e.g. `CS-001`) |
| `bookName` | String | Required, Indexed | Title of the book (English / Devanagari) |
| `author` | String | Required | Author name |
| `publisher` | String | Optional | Publisher details |
| `subject` | String | Optional | Subject / Genre |
| `category` | String | Optional | Category (e.g. `Science`, `Literature`) |
| `ddcCode` | String | Optional | Dewey Decimal Classification code |
| `callNumber` | String | Optional | Call Number (e.g. `823.91 TAN`) |
| `bookNumber` | String | Optional | Book Number (e.g. `B-014`) |
| `shelfLocation` | String | Optional | Shelf Number (e.g. `#08`) |
| `totalCopies` | Number | Default: 1 | Total owned copies |
| `availableCopies`| Number | Default: 1 | Currently available copies |
| `coverImage` | String | Optional | Image URL or Base64 string |

---

### 2. `students` Collection
| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `_id` / `studentId` | String | Primary Key, Unique | Roll Number / Registration ID |
| `name` | String | Required | Full Name of student |
| `class` | String | Required | Grade / Class (e.g. `10th`, `12th`) |
| `section` | String | Optional | Section (e.g. `A`, `B`) |
| `rollNo` | String | Required | Class Roll Number |
| `mobile` | String | Optional | Contact mobile number |
| `email` | String | Optional | Contact email address |
| `booksIssuedCount` | Number | Default: 0 | Number of currently borrowed books |
| `passwordHash` | String | Hidden | Hashed password credential |

---

### 3. `issuelogs` Collection
| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `_id` / `logId` | String | Primary Key | Unique Issue Log Transaction ID |
| `bookId` | String | Foreign Key -> `books.bookId` | Borrowed Book ID |
| `bookTitle` | String | Denormalized | Title for rapid rendering |
| `studentId` | String | Foreign Key -> `students.studentId` | Borrower Student ID |
| `studentName` | String | Denormalized | Name of student borrower |
| `issueDate` | Date/String | Required | Date book was issued |
| `dueDate` | Date/String | Required | Scheduled return date |
| `returnDate` | Date/String | Optional | Actual date book was returned |
| `status` | String | Enum: `ISSUED`, `RETURNED`, `OVERDUE` | Transaction status |
| `fineAmount` | Number | Default: 0 | Late return penalty fine |

---

### 4. `requests` Collection
| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `_id` / `requestId` | String | Primary Key | Reservation Request ID |
| `studentId` | String | Foreign Key | Requesting Student ID |
| `studentName` | String | Denormalized | Student Name |
| `bookId` | String | Foreign Key | Requested Book ID |
| `bookTitle` | String | Denormalized | Book Title |
| `requestDate` | Date/String | Required | Request timestamp |
| `status` | String | Enum: `PENDING`, `APPROVED`, `REJECTED`, `HELD` | Approval status |

---

## Part 2: REST API Endpoints

### Health & System Status
- **`GET /api/health`**
  - **Auth:** None
  - **Response:** `{ "status": "ok", "uptime": 12450 }`
- **`GET /api/database/status`**
  - **Auth:** None
  - **Response:**
    ```json
    {
      "connected": true,
      "mode": "production",
      "uriPresent": true,
      "maskedUri": "mongodb+srv://******@cluster.mongodb.net"
    }
    ```

---

### Catalog & Book Endpoints
- **`GET /api/books`**
  - **Auth:** None
  - **Response:** `[ { "bookId": "CS-001", "bookName": "Computer Science Principles", ... } ]`
- **`GET /api/books/by-accession/:accessionNo`**
  - **Auth:** None
  - **Response:** `{ "success": true, "book": { ... } }`
- **`POST /api/books`**
  - **Auth:** Librarian
  - **Body:** `{ "bookName": "...", "author": "...", "accessionNumber": "CS-002", "totalCopies": 2 }`
  - **Response:** `{ "success": true, "book": { ... } }`
- **`PUT /api/books/:id`**
  - **Auth:** Librarian
  - **Response:** `{ "success": true, "book": { ... } }`
- **`DELETE /api/books/:id`**
  - **Auth:** Librarian
  - **Response:** `{ "success": true }`
- **`POST /api/books/bulk`**
  - **Auth:** Librarian
  - **Body:** `{ "books": [ ... ] }`
  - **Response:** `{ "success": true, "importedCount": 15 }`

---

### Student Endpoints
- **`GET /api/students`**
  - **Auth:** Librarian
  - **Response:** `[ { "studentId": "STU-101", "name": "Rahul Kumar", "class": "10th" } ]`
- **`POST /api/students`**
  - **Auth:** Librarian
  - **Body:** `{ "studentId": "STU-102", "name": "Priya Sharma", "class": "12th", "rollNo": "04" }`
- **`PUT /api/students/:id`**
  - **Auth:** Librarian / Self Student
- **`DELETE /api/students/:id`**
  - **Auth:** Librarian

---

### Issue & Loan Endpoints
- **`POST /api/issue-logs/bulk-issue`**
  - **Auth:** Librarian
  - **Body:** `{ "studentId": "STU-101", "bookIds": ["CS-001"], "dueDate": "2026-08-20" }`
  - **Response:** `{ "success": true, "issuedLogs": [ ... ] }`
- **`PUT /api/issue-logs/:logId/return`**
  - **Auth:** Librarian
  - **Response:** `{ "success": true, "fine": 0 }`

---

### Reservation Request Endpoints
- **`POST /api/requests`**
  - **Auth:** Student
  - **Body:** `{ "studentId": "STU-101", "bookId": "CS-001" }`
- **`PUT /api/requests/:id/approve`**
  - **Auth:** Librarian
- **`PUT /api/requests/:id/reject`**
  - **Auth:** Librarian

---

### Authentication Endpoints
- **`POST /api/auth/login`**
  - **Body:** `{ "username": "librarian", "password": "..." }` or `{ "studentId": "STU-101", "password": "..." }`
  - **Response:** `{ "success": true, "token": "...", "user": { "role": "librarian", "name": "Head Librarian" } }`
- **`POST /api/auth/change-credentials`**
  - **Auth:** Authenticated User
  - **Body:** `{ "currentPassword": "...", "newPassword": "..." }`
