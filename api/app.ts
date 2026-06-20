/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, dbService } from './server_db.js';
import { Book, Student, BorrowRequest, BookIssueLog } from '../src/types.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure active MongoDB connection for every request to eliminate serverless cold-start race conditions.
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
  } catch (err: any) {
    console.warn("Database middleware connection alert:", err.message);
  }
  next();
});

// Persistent JSON storage path for Librarian account credentials (Vercel-safe)
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const CONFIG_PATH = isVercel
  ? path.join('/tmp', 'librarian_v2_credentials.json')
  : path.join(process.cwd(), 'librarian_v2_credentials.json');

// Initialize secure credentials
let memoryLibrarianConfig: any = null;

try {
  if (!fs.existsSync(CONFIG_PATH)) {
    const initialConfig = {
      username: "ramdiri_admin_roy",
      name: "S. K. Roy (Chief Librarian)",
      passwordHash: bcrypt.hashSync("LibrarianSecureBegusarai2026!", 10)
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(initialConfig, null, 2));
    memoryLibrarianConfig = initialConfig;
  }
} catch (err) {
  console.error("Warning: Failed to create or write librarian_v2_credentials.json:", err);
}

async function getLibrarianConfig(): Promise<any> {
  const fallback = {
    username: "ramdiri_admin_roy",
    name: "S. K. Roy (Chief Librarian)",
    passwordHash: bcrypt.hashSync("LibrarianSecureBegusarai2026!", 10)
  };

  try {
    await connectDatabase();
    if (dbService.getMongoConnectionState()) {
      const dbConfig = await dbService.getLibrarianConfigDb();
      if (dbConfig) {
        memoryLibrarianConfig = dbConfig;
        return dbConfig;
      } else {
        // Safe bootstrapping if not found in db yet
        let diskConfig: any = null;
        if (fs.existsSync(CONFIG_PATH)) {
          try {
            diskConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
          } catch (e) {
            console.warn("Failed to parse disk config:", e);
          }
        }
        const activeConfig = diskConfig || fallback;
        if (!activeConfig.name) {
          activeConfig.name = "S. K. Roy (Chief Librarian)";
        }
        await dbService.saveLibrarianConfigDb(activeConfig);
        memoryLibrarianConfig = activeConfig;
        return activeConfig;
      }
    }
  } catch (err: any) {
    console.warn("getLibrarianConfig DB retrieval alert, using disk/static fallback:", err.message);
  }

  if (memoryLibrarianConfig) {
    return memoryLibrarianConfig;
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (!config.name) {
        config.name = "S. K. Roy (Chief Librarian)";
      }
      memoryLibrarianConfig = config;
      return config;
    }
  } catch (err) {
    console.warn("Failed to read librarian credentials file, using fallback:", err);
  }
  memoryLibrarianConfig = fallback;
  return fallback;
}

const JWT_SECRET = process.env.JWT_SECRET || "ramdiri_super_secret_jwt_key_2026";

// Helpers for date calculations
function toStandardDate(str: string): string {
  if (!str) return "";
  const parts = str.trim().split(/[-/.]/);
  if (parts.length !== 3) return str;

  let day = 0;
  let month = 0;
  let year = 0;

  if (parts[0].length === 4) {
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  } else if (parts[2].length === 4) {
    day = parseInt(parts[0]);
    month = parseInt(parts[1]);
    year = parseInt(parts[2]);
  } else {
    return str;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return str;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`; // Align to ISO YYYY-MM-DD
}

function getFormattedTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours}:${minutesStr} ${ampm}`;
}

// Security Middlewares
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication missing or corrupt token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Auth session expired or invalid' });
  }
}

function requireLibrarian(req: any, res: any, next: any) {
  if (req.user?.role !== 'Librarian') {
    return res.status(403).json({ error: 'Access denied: Librarian action authorization required' });
  }
  next();
}

async function addAuditLog(req: any, action: 'Book Issued' | 'Book Returned' | 'Student Added' | 'Student Edited' | 'Student Deleted' | 'Book Added' | 'Book Edited' | 'Book Deleted' | 'Request Cancelled', details: string) {
  const username = req.user?.name || req.user?.username || "Chief Librarian";
  const log = {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    user: username,
    action,
    details
  };
  try {
    await dbService.saveAuditLog(log as any);
  } catch (err) {
    console.error("Failed to write to permanent audit logging file", err);
  }
}

app.get('/api/audit-logs', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---- SYSTEM INFRASTRUCTURE HEALTH ----
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    school: "Ramdiri +2 High School Digital Library Management System",
    region: "Begusarai, Bihar"
  });
});

app.get('/api/database/status', (req, res) => {
  const isConnected = dbService.getMongoConnectionState();
  const uri = process.env.MONGODB_URI || "";
  const maskedUri = uri ? uri.replace(/:([^@]+)@/, ":******@") : "none";
  res.json({
    connected: isConnected,
    mode: process.env.NODE_ENV || "development",
    uriPresent: !!uri && uri.trim() !== "" && !uri.includes("placeholder"),
    uriSub: uri ? uri.slice(0, 20) + "..." : null,
    maskedUri: maskedUri
  });
});

// ---- AUTH ENGINES ----
app.post('/api/auth/login', async (req, res) => {
  const { username, password, rollNumber, dob, role, classValue, sectionValue } = req.body;
  console.log(`[API ROUTE] POST /api/auth/login started for role: ${role}. Params:`, { role, username, rollNumber, dob, classValue, sectionValue });

  try {
    if (role === 'Librarian') {
      const activeConfig = await getLibrarianConfig();
      const isCorrectUser = username?.toLowerCase().trim() === activeConfig.username.toLowerCase().trim();
      const isCorrectPass = password && bcrypt.compareSync(password, activeConfig.passwordHash);

      if (isCorrectUser && isCorrectPass) {
        const token = jwt.sign(
          { role: 'Librarian', username: activeConfig.username, name: activeConfig.name || "S. K. Roy (Chief Librarian)" },
          JWT_SECRET,
          { expiresIn: '1d' }
        );
        console.log(`[API ROUTE] Librarian login SUCCESSFUL for user: ${username}`);
        return res.json({
          success: true,
          token,
          role: 'Librarian'
        });
      } else {
        console.log(`[API ROUTE] Librarian login attempt did not match credentials.`);
        return res.status(401).json({ 
          success: false, 
          error: "Access Denied: Incorrect Librarian Username or Password." 
        });
      }
    } else {
      // Student authentication
      const roll = parseInt(rollNumber);
      if (!rollNumber || isNaN(roll)) {
        return res.status(400).json({ 
          success: false, 
          error: "Please enter a valid positive Roll Number." 
        });
      }
      if (!dob) {
        return res.status(400).json({ 
          success: false, 
          error: "Please select / specify your Date of Birth." 
        });
      }

      const inputDobStandard = toStandardDate(dob);
      const inputClass = classValue ? classValue.toString().trim() : '';
      const inputSection = sectionValue ? sectionValue.toString().trim().toUpperCase() : '';

      if (!inputClass || !inputSection) {
        return res.status(400).json({
          success: false,
          error: "Student login requires Class and Section specification for ID uniqueness."
        });
      }

      console.log(`[API ROUTE] Fetching students list for Student validation...`);
      const studentsList = await dbService.getStudents();
      console.log(`[API ROUTE] Loaded ${studentsList.length} total students. Matching against Class: ${inputClass}, Section: ${inputSection}, Roll: ${roll}, DOB: ${inputDobStandard}`);
      const matched = studentsList.find((s: Student) => {
        const sId = s.studentId || `${s.class || "10"}-${(s.section || "A").toUpperCase()}-${s.rollNumber}`;
        const searchId = `${inputClass}-${inputSection}-${roll}`;
        return sId === searchId && toStandardDate(s.dob) === inputDobStandard;
      });

      if (matched) {
        const token = jwt.sign(
          { role: 'Student', rollNumber: roll, name: matched.name },
          JWT_SECRET,
          { expiresIn: '1d' }
        );
        console.log(`[API ROUTE] Student login SUCCESSFUL for student: ${matched.name}`);
        return res.json({
          success: true,
          token,
          role: 'Student',
          student: matched
        });
      } else {
        console.warn(`[API ROUTE] Student login FAILED. No matching record in ${studentsList.length} students.`);
        return res.status(401).json({ 
          success: false, 
          error: "Authentication Failed: Roll Number and DOB do not match school records." 
        });
      }
    }
  } catch (error: any) {
    console.error(`[API ROUTE ERROR] POST /api/auth/login crash encountered:`, error);
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization header missing' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, decoded });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token is invalid or expired' });
  }
});

app.post('/api/auth/change-credentials', authenticateToken, requireLibrarian, async (req, res) => {
  const { oldPassword, newName, newUsername, newPassword } = req.body;

  if (!oldPassword) {
    return res.status(400).json({ success: false, error: 'Current credentials authorization password is required to save changes.' });
  }

  const activeConfig = await getLibrarianConfig();
  const isPassCorrect = bcrypt.compareSync(oldPassword, activeConfig.passwordHash);

  if (!isPassCorrect) {
    return res.status(401).json({ success: false, error: 'Incorrect current validation password' });
  }

  // Update Display Name if provided
  const updatedName = newName && newName.trim() ? newName.trim() : activeConfig.name;
  
  // Update Username if provided
  const updatedUsername = newUsername && newUsername.trim() ? newUsername.toLowerCase().trim() : activeConfig.username;

  // Update Password hash if provided
  let updatedPasswordHash = activeConfig.passwordHash;
  if (newPassword && newPassword.trim()) {
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters in length' });
    }
    updatedPasswordHash = bcrypt.hashSync(newPassword.trim(), 10);
  }

  const updatedConfig = {
    username: updatedUsername,
    name: updatedName,
    passwordHash: updatedPasswordHash
  };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
    memoryLibrarianConfig = updatedConfig;
    await dbService.saveLibrarianConfigDb(updatedConfig);
    console.log("Successfully persisted updated librarian credentials to MongoDB Atlas Cloud.");
  } catch (e: any) {
    console.error("Warning: Failed to write librarian_v2_credentials.json update:", e.message);
  }

  // Generate a brand new JWT token so that user transitions smoothly
  const newToken = jwt.sign(
    { role: 'Librarian', username: updatedUsername, name: updatedName },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({
    success: true,
    message: 'Chief Librarian access credentials and profile updated successfully',
    token: newToken,
    name: updatedName,
    username: updatedUsername
  });
});


// ---- BOOKS REST API ENDPOINTS ----
app.get('/api/books', async (req, res) => {
  console.log(`[API ROUTE] GET /api/books requested. Mongo Link Status: ${dbService.getMongoConnectionState()}`);
  try {
    const books = await dbService.getBooks();
    console.log(`[API ROUTE] GET /api/books loaded ${books.length} book records successfully.`);
    res.json(books);
  } catch (error: any) {
    console.error(`[API ROUTE ERROR] GET /api/books exception encountered:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post('/api/books', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const newBook = await dbService.saveBook(req.body);
    await addAuditLog(req, 'Book Added', `Added book '${newBook.bookName}' (ID: ${newBook.bookId}, Accession: ${newBook.accessionNumber || newBook.bookId})`);
    res.status(201).json(newBook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/books/bulk', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const records = req.body.books;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid books bulk upload payload. Expected a list of books." });
    }
    const { saved, skippedCount } = await dbService.saveBooksBulk(records);
    await addAuditLog(req, 'Book Added', `Bulk imported ${saved.length} books into catalog register. Skipped ${skippedCount} duplicate Accession items.`);
    res.json({ success: true, count: saved.length, skippedCount, records: saved });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/database/stats', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const stats = await dbService.getDbStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/books/:id', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const updatedBook = await dbService.saveBook({ ...req.body, bookId: req.params.id });
    await addAuditLog(req, 'Book Edited', `Edited specifications for book '${updatedBook.bookName}' (ID: ${updatedBook.bookId})`);
    res.json(updatedBook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/books/:id', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const success = await dbService.deleteBook(req.params.id);
    await addAuditLog(req, 'Book Deleted', `Deleted book record ID ${req.params.id} from library inventory.`);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/bulk-delete', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const { bookIds } = req.body;
    if (!Array.isArray(bookIds)) {
      return res.status(400).json({ error: "Invalid body. Expected 'bookIds' list." });
    }
    const count = await dbService.deleteBooksBulk(bookIds);
    await addAuditLog(req, 'Book Deleted', `Bulk deleted ${count} books from inventory index.`);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/clear-inventory', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const count = await dbService.clearBooksInventory();
    await addAuditLog(req, 'Book Deleted', `Completely purged the entire school books inventory (${count} items deleted).`);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ---- STUDENTS REST API ENDPOINTS ----
app.get('/api/students', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const students = await dbService.getStudents();
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const newStudent = await dbService.saveStudent(req.body, false);
    await addAuditLog(req, 'Student Added', `Enrolled new student '${newStudent.name}' (Class: ${newStudent.class}, Sec: ${newStudent.section}, Roll: ${newStudent.rollNumber})`);
    res.status(201).json(newStudent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/students/:studentId', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const updatedStudent = await dbService.saveStudent(req.body, true);
    await addAuditLog(req, 'Student Edited', `Edited student record for '${updatedStudent.name}' (ID: ${updatedStudent.studentId})`);
    res.json(updatedStudent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/students/:studentId', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const success = await dbService.deleteStudent(req.params.studentId);
    await addAuditLog(req, 'Student Deleted', `Expelled/Deleted student record ID ${req.params.studentId} from school library registers.`);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/bulk', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const records: Student[] = req.body.students;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid student bulk upload content." });
    }
    const { saved, skippedCount } = await dbService.saveStudentsBulk(records);
    await addAuditLog(req, 'Student Added', `Bulk imported list of ${saved.length} students from enrollment Excel sheet. Skipped ${skippedCount} duplicate student rolls.`);
    res.json({ success: true, count: saved.length, skippedCount, records: saved });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});


// ---- BORROW REQUESTS ENDPOINTS ----
app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await dbService.getBorrowRequests();
    const reqUser = (req as any).user;
    // Filter requests if it is a student
    if (reqUser?.role === 'Student') {
      const studentRequests = requests.filter((r: BorrowRequest) => r.rollNumber === reqUser.rollNumber);
      return res.json(studentRequests);
    }
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
  try {
    const reqBody: BorrowRequest = req.body;
    const reqUser = (req as any).user;
    
    // Prevent unauthenticated students from making requests for other students
    if (reqUser?.role === 'Student' && reqUser.rollNumber !== reqBody.rollNumber) {
      return res.status(403).json({ error: "Security Guard: Student cannot request books for other roll numbers." });
    }

    // Validate if book exists and has copies
    const books = await dbService.getBooks();
    const book = books.find(b => b.bookId === reqBody.bookId);
    if (!book) {
      return res.status(404).json({ error: "Book code is not registered." });
    }
    if (book.availableCopies <= 0) {
      return res.status(400).json({ error: "Data Integrity Guard: Book copies are currently out of stock." });
    }

    // Prevent duplicate pending borrow requests
    const requests = await dbService.getBorrowRequests();
    const duplicate = requests.some(r => r.rollNumber === reqBody.rollNumber && r.bookId === reqBody.bookId && r.status === 'Pending');
    if (duplicate) {
      return res.status(400).json({ error: "Active requests guard: You already have a pending borrow request for this title." });
    }

    // Prevent borrow of already issued titles
    const logs = await dbService.getIssueLogs();
    const alreadyIssued = logs.some(l => l.rollNumber === reqBody.rollNumber && l.bookId === reqBody.bookId && l.status === 'Issued');
    if (alreadyIssued) {
      return res.status(400).json({ error: "Active outstanding loans guard: This books is currently issued to you." });
    }

    const created = await dbService.saveBorrowRequest(reqBody);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/requests/:id/approve', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const requestId = req.params.id;
    const requests = await dbService.getBorrowRequests();
    const borrowReq = requests.find(r => r.id === requestId);
    if (!borrowReq) {
      return res.status(404).json({ error: "Borrow request code not discovered." });
    }
    if (borrowReq.status !== 'Pending') {
      return res.status(400).json({ error: "Request is already settled." });
    }

    // Verify copy availability
    const books = await dbService.getBooks();
    const bookIndex = books.findIndex(b => b.bookId === borrowReq.bookId);
    if (bookIndex === -1) {
      return res.status(404).json({ error: "Linked book code does not exist." });
    }
    const book = books[bookIndex];
    if (book.availableCopies <= 0) {
      return res.status(400).json({ error: "Resource Guard: All copies have been checked out." });
    }

    // Get student details to obtain class/section
    const students = await dbService.getStudents();
    const student = students.find(s => s.rollNumber === borrowReq.rollNumber);
    const studClass = student?.class || "10";
    const studSection = student?.section || "A";

    // Set request as Approved
    await dbService.updateBorrowRequestStatus(requestId, 'Approved');

    // Reduce copies count
    book.availableCopies -= 1;
    await dbService.saveBook(book);

    // Create Issue log
    const issueDateStr = new Date().toISOString().split('T')[0];
    const customDueDate = req.body.dueDate;
    let dueDateStr = customDueDate;
    if (!dueDateStr) {
      const due = new Date();
      due.setDate(due.getDate() + 14); // 2 weeks fallback duration
      dueDateStr = due.toISOString().split('T')[0];
    }

    const issueLog: BookIssueLog = {
      id: `LOG-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
      studentName: borrowReq.studentName,
      rollNumber: borrowReq.rollNumber,
      class: studClass,
      section: studSection,
      bookId: borrowReq.bookId,
      bookName: borrowReq.bookName,
      issueDate: issueDateStr,
      issueTime: getFormattedTime(),
      dueDate: dueDateStr,
      status: 'Issued'
    };

    const savedLog = await dbService.saveIssueLog(issueLog);
    await addAuditLog(req, 'Book Issued', `Issued book '${borrowReq.bookName}' (ID: ${borrowReq.bookId}) to student ${borrowReq.studentName} (Roll: ${borrowReq.rollNumber})`);
    res.json({ success: true, log: savedLog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests/:id/reject', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const reqStatus = await dbService.updateBorrowRequestStatus(req.params.id, 'Rejected');
    if (!reqStatus) {
      return res.status(404).json({ error: "Borrow request code not discovered." });
    }
    res.json({ success: true, request: reqStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const requests = await dbService.getBorrowRequests();
    const borrowReq = requests.find(r => r.id === requestId);
    if (!borrowReq) {
      return res.status(404).json({ error: "Borrow request code not discovered." });
    }
    const reqUser = (req as any).user;
    if (reqUser?.role === 'Student' && reqUser.rollNumber !== borrowReq.rollNumber) {
      return res.status(403).json({ error: "Request cancel shield: You cannot cancel another student's request." });
    }
    if (borrowReq.status !== 'Pending') {
      return res.status(400).json({ error: "Only outstanding pending requests can be cancelled." });
    }
    const updated = await dbService.updateBorrowRequestStatus(requestId, 'Cancelled');
    await addAuditLog(req, 'Request Cancelled', `Student ${borrowReq.studentName} (Roll: ${borrowReq.rollNumber}) cancelled borrow request for book ID '${borrowReq.bookId}'`);
    res.json({ success: true, request: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issue-logs/bulk-issue', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const { rollNumber, class: studClass, section, studentName, bookIds, dueDate } = req.body;
    
    if (!rollNumber || !studClass || !section || !studentName || !bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return res.status(400).json({ error: "Missing required multi-book issue information." });
    }

    const books = await dbService.getBooks();
    const students = await dbService.getStudents();
    const matchedStudent = students.find(s => s.rollNumber === parseInt(rollNumber) && s.class === String(studClass) && s.section === String(section));

    if (!matchedStudent) {
      return res.status(400).json({ error: "Student not found in school records." });
    }

    // First validate draft books checking and copy levels
    for (const bId of bookIds) {
      const bk = books.find(b => b.bookId === bId);
      if (!bk) {
        return res.status(404).json({ error: `Book (ID: ${bId}) not found in database.` });
      }
      if (bk.availableCopies <= 0) {
        return res.status(400).json({ error: `Book '${bk.bookName}' (ID: ${bId}) has zero available copies on physical shelf.` });
      }
    }

    const issueDateStr = new Date().toISOString().split('T')[0];
    let dueDateStr = dueDate;
    if (!dueDateStr) {
      const due = new Date();
      due.setDate(due.getDate() + 14);
      dueDateStr = due.toISOString().split('T')[0];
    }

    const savedLogs: BookIssueLog[] = [];

    for (const bId of bookIds) {
      const bk = books.find(b => b.bookId === bId)!;

      // 1. Create approved borrow request track record
      const borrowReq: BorrowRequest = {
        id: `RQ-DIR-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
        studentName: matchedStudent.name,
        rollNumber: matchedStudent.rollNumber,
        bookId: bk.bookId,
        bookName: bk.bookName,
        requestDate: issueDateStr,
        status: 'Approved'
      };
      await dbService.saveBorrowRequest(borrowReq);

      // 2. Reduce shelf copying inventory count
      bk.availableCopies -= 1;
      await dbService.saveBook(bk);

      // 3. Create issue checkout ledger
      const issueLog: BookIssueLog = {
        id: `LOG-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
        studentName: matchedStudent.name,
        rollNumber: matchedStudent.rollNumber,
        class: matchedStudent.class,
        section: matchedStudent.section,
        bookId: bk.bookId,
        bookName: bk.bookName,
        issueDate: issueDateStr,
        issueTime: getFormattedTime(),
        dueDate: dueDateStr,
        status: 'Issued'
      };
      
      const saved = await dbService.saveIssueLog(issueLog);
      savedLogs.push(saved);

      // 4. Register to audit tracking
      await addAuditLog(req, 'Book Issued', `Direct Desk Issue check: '${bk.bookName}' (ID: ${bk.bookId}) physical checkout given to ${matchedStudent.name} (Roll: ${matchedStudent.rollNumber}, SEC ${matchedStudent.class}-${matchedStudent.section})`);
    }

    res.status(201).json({ success: true, count: savedLogs.length, logs: savedLogs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ---- BOOK ISSUE LOGS REST ENDPOINTS ----
app.get('/api/issue-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await dbService.getIssueLogs();
    const reqUser = (req as any).user;
    if (reqUser?.role === 'Student') {
      const studentLogs = logs.filter((l: BookIssueLog) => l.rollNumber === reqUser.rollNumber);
      return res.json(studentLogs);
    }
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issue-logs/:id/return', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const logId = req.params.id;
    const logs = await dbService.getIssueLogs();
    const logIndex = logs.findIndex(l => l.id === logId);
    if (logIndex === -1) {
      return res.status(404).json({ error: "Issue log record not found." });
    }

    const log = logs[logIndex];
    if (log.status === 'Returned') {
      return res.status(400).json({ error: "Book has already been returned previously." });
    }

    // Mark as Returned
    log.status = 'Returned';
    log.returnDate = new Date().toISOString().split('T')[0];
    log.returnTime = getFormattedTime();
    await dbService.saveIssueLog(log);

    // Replenish copies count
    const books = await dbService.getBooks();
    const book = books.find(b => b.bookId === log.bookId);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      await dbService.saveBook(book);
    }

    await addAuditLog(req, 'Book Returned', `Returned book '${log.bookName}' (ID: ${log.bookId}) from student ${log.studentName} (Roll: ${log.rollNumber})`);
    res.json({ success: true, log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ---- SYSTEM DATABASE RESET CONTROL ROUTE ----
app.post('/api/database/reset', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    const BUNDLED_DB_DIR = path.join(process.cwd(), 'data', 'db');
    const LOCAL_DB_DIR = isServerless ? path.join('/tmp', 'data', 'db') : BUNDLED_DB_DIR;
    
    // Clear MongoDB if connected
    const mongooseConnection = mongoose.connection;
    if (mongooseConnection.readyState === 1) {
      await mongooseConnection.db?.collection('books').deleteMany({});
      await mongooseConnection.db?.collection('students').deleteMany({});
      await mongooseConnection.db?.collection('borrowrequests').deleteMany({});
      await mongooseConnection.db?.collection('bookissuelogs').deleteMany({});
      
      const baselineBooks = [
        {
          bookId: "B001",
          bookName: "Rashmirathi (रश्मिरथी)",
          author: "Ramdhari Singh Dinkar",
          publisher: "Rajkamal Prakashan",
          category: "Literature",
          description: "One of the most celebrated epic Hindi books of Ramdhari Singh Dinkar, our district's own poet-laureate born in Simaria, Begusarai. Reflects on the life and ethics of Karna from Mahabharata.",
          totalCopies: 10,
          availableCopies: 8,
          coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300"
        },
        {
          bookId: "B002",
          bookName: "Mathematics Part-I (Class 12)",
          author: "NCERT Educational Editorial Board",
          publisher: "NCERT Bihar Secondary Trust",
          category: "Mathematics",
          description: "Official NCERT Textbook covering Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, Continuity and Differentiability.",
          totalCopies: 15,
          availableCopies: 13,
          coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300"
        },
        {
          bookId: "B003",
          bookName: "Godhuli Hindi Bhag 2 (Class 10)",
          author: "Bihar State Textbook Publishing Corp",
          publisher: "BSTBPC, Patna",
          category: "Hindi",
          description: "Bihar Board Class 10 Hindi Prose and Poetry collection with classic literature from Premchand, Ramdhari Singh Dinkar, and other stalwarts.",
          totalCopies: 25,
          availableCopies: 24,
          coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300"
        },
        {
          bookId: "B004",
          bookName: "Concepts of Physics (Part 1)",
          author: "Dr. H.C. Verma",
          publisher: "Bharati Bhawan Publishers",
          category: "Physics",
          description: "The premier handbook for senior secondary physics, designed with conceptual exercises and intensive problems.",
          totalCopies: 30,
          availableCopies: 28,
          coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=300"
        },
        {
          bookId: "B005",
          bookName: "Wings of Fire: An Autobiography",
          author: "Dr. A.P.J. Abdul Kalam",
          publisher: "Universities Press",
          category: "Biography",
          description: "Inspiring autobiography of the Missile Man of India and former President Dr. Kalam, covering his childhood in Rameshwaram, struggles, and rocket science achievements.",
          totalCopies: 12,
          availableCopies: 11,
          coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=300"
        },
        {
          bookId: "B006",
          bookName: "Science Textbook for Class 9",
          author: "NCERT Board",
          publisher: "NCERT Patna",
          category: "Biology",
          description: "Class 9 science topics covering Matter, Cells, Tissues, Diversity, Motion, Force, Gravitation, Sound, and Natural Resources.",
          totalCopies: 20,
          availableCopies: 19,
          coverImage: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=300"
        }
      ];
      const baselineStudents = [
        { name: "Aashish Kumar Dinkar", rollNumber: 12, dob: "2010-05-15", class: "10", section: "A" },
        { name: "Priya Ranjan Kumari", rollNumber: 4, dob: "2011-08-20", class: "9", section: "B" },
        { name: "Gautam Singh Yadav", rollNumber: 23, dob: "2010-12-05", class: "10", section: "A" },
        { name: "Shalini Sinha", rollNumber: 1, dob: "2011-03-01", class: "10", section: "C" }
      ];
      const baselineRequests = [
        { id: "RQ001", studentName: "Aashish Kumar Dinkar", rollNumber: 12, bookId: "B001", bookName: "Rashmirathi (रश्मिरथी)", requestDate: "2026-06-11", status: "Pending" },
        { id: "RQ002", studentName: "Shalini Sinha", rollNumber: 1, bookId: "B004", bookName: "Concepts of Physics (Part 1)", requestDate: "2026-06-12", status: "Pending" }
      ];
      const baselineLogs = [
        { id: "LOG001", studentName: "Aashish Kumar Dinkar", rollNumber: 12, class: "10", section: "A", bookId: "B002", bookName: "Mathematics Part-I (Class 12)", issueDate: "2026-06-01", dueDate: "2026-06-15", status: "Issued" },
        { id: "LOG002", studentName: "Priya Ranjan Kumari", rollNumber: 4, class: "9", section: "B", bookId: "B003", bookName: "Godhuli Hindi Bhag 2 (Class 10)", issueDate: "2026-05-25", dueDate: "2026-06-08", returnDate: "2026-06-05", status: "Returned" }
      ];

      await mongooseConnection.db?.collection('books').insertMany(baselineBooks);
      await mongooseConnection.db?.collection('students').insertMany(baselineStudents);
      await mongooseConnection.db?.collection('borrowrequests').insertMany(baselineRequests);
      await mongooseConnection.db?.collection('bookissuelogs').insertMany(baselineLogs);
    }

    // Reset local files always
    const BOOKS_FILE = path.join(LOCAL_DB_DIR, 'books.json');
    const STUDENTS_FILE = path.join(LOCAL_DB_DIR, 'students.json');
    const REQUESTS_FILE = path.join(LOCAL_DB_DIR, 'requests.json');
    const ISSUE_LOGS_FILE = path.join(LOCAL_DB_DIR, 'issue_logs.json');

    const seedBooksDefault = [
      {
        bookId: "B001",
        bookName: "Rashmirathi (रश्मिरथी)",
        author: "Ramdhari Singh Dinkar",
        publisher: "Rajkamal Prakashan",
        category: "Literature",
        description: "One of the most celebrated epic Hindi books of Ramdhari Singh Dinkar, our district's own poet-laureate born in Simaria, Begusarai. Reflects on the life and ethics of Karna from Mahabharata.",
        totalCopies: 10,
        availableCopies: 8,
        coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300"
      },
      {
        bookId: "B002",
        bookName: "Mathematics Part-I (Class 12)",
        author: "NCERT Educational Editorial Board",
        publisher: "NCERT Bihar Secondary Trust",
        category: "Mathematics",
        description: "Official NCERT Textbook covering Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, Continuity and Differentiability.",
        totalCopies: 15,
        availableCopies: 13,
        coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300"
      },
      {
        bookId: "B003",
        bookName: "Godhuli Hindi Bhag 2 (Class 10)",
        author: "Bihar State Textbook Publishing Corp",
        publisher: "BSTBPC, Patna",
        category: "Hindi",
        description: "Bihar Board Class 10 Hindi Prose and Poetry collection with classic literature from Premchand, Ramdhari Singh Dinkar, and other stalwarts.",
        totalCopies: 25,
        availableCopies: 24,
        coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300"
      },
      {
        bookId: "B004",
        bookName: "Concepts of Physics (Part 1)",
        author: "Dr. H.C. Verma",
        publisher: "Bharati Bhawan Publishers",
        category: "Physics",
        description: "The premier handbook for senior secondary physics, designed with conceptual exercises and intensive problems.",
        totalCopies: 30,
        availableCopies: 28,
        coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=300"
      },
      {
        bookId: "B005",
        bookName: "Wings of Fire: An Autobiography",
        author: "Dr. A.P.J. Abdul Kalam",
        publisher: "Universities Press",
        category: "Biography",
        description: "Inspiring autobiography of the Missile Man of India and former President Dr. Kalam, covering his childhood in Rameshwaram, struggles, and rocket science achievements.",
        totalCopies: 12,
        availableCopies: 11,
        coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=300"
      },
      {
        bookId: "B006",
        bookName: "Science Textbook for Class 9",
        author: "NCERT Board",
        publisher: "NCERT Patna",
        category: "Biology",
        description: "Class 9 science topics covering Matter, Cells, Tissues, Diversity, Motion, Force, Gravitation, Sound, and Natural Resources.",
        totalCopies: 20,
        availableCopies: 19,
        coverImage: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=300"
      }
    ];
    const seedStudentsDefault = [
      { name: "Aashish Kumar Dinkar", rollNumber: 12, dob: "2010-05-15", class: "10", section: "A" },
      { name: "Priya Ranjan Kumari", rollNumber: 4, dob: "2011-08-20", class: "9", section: "B" },
      { name: "Gautam Singh Yadav", rollNumber: 23, dob: "2010-12-05", class: "10", section: "A" },
      { name: "Shalini Sinha", rollNumber: 1, dob: "2011-03-01", class: "10", section: "C" }
    ];
    const seedRequestsDefault = [
      { id: "RQ001", studentName: "Aashish Kumar Dinkar", rollNumber: 12, bookId: "B001", bookName: "Rashmirathi (रश्मिरथी)", requestDate: "2026-06-11", status: "Pending" },
      { id: "RQ002", studentName: "Shalini Sinha", rollNumber: 1, bookId: "B004", bookName: "Concepts of Physics (Part 1)", requestDate: "2026-06-12", status: "Pending" }
    ];
    const seedLogsDefault = [
      { id: "LOG001", studentName: "Aashish Kumar Dinkar", rollNumber: 12, class: "10", section: "A", bookId: "B002", bookName: "Mathematics Part-I (Class 12)", issueDate: "2026-06-01", dueDate: "2026-06-15", status: "Issued" },
      { id: "LOG002", studentName: "Priya Ranjan Kumari", rollNumber: 4, class: "9", section: "B", bookId: "B003", bookName: "Godhuli Hindi Bhag 2 (Class 10)", issueDate: "2026-05-25", dueDate: "2026-06-08", returnDate: "2026-06-05", status: "Returned" }
    ];

    try {
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(seedBooksDefault, null, 2));
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(seedStudentsDefault, null, 2));
      fs.writeFileSync(REQUESTS_FILE, JSON.stringify(seedRequestsDefault, null, 2));
      fs.writeFileSync(ISSUE_LOGS_FILE, JSON.stringify(seedLogsDefault, null, 2));
    } catch (e) {
      console.error("Warning: Failed to write seeded database files to filesystem:", e);
    }

    res.json({ success: true, message: "School academic records factory reseeded seamlessly." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk student delete endpoint
app.post('/api/students/bulk-delete', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: "Invalid studentIds list format." });
    }
    const count = await dbService.deleteStudentsBulk(studentIds);
    await addAuditLog(req, 'Student Deleted', `Bulk deleted a selection of ${count} students from school registries.`);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear entire student registry endpoint
app.post('/api/students/clear-registry', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const count = await dbService.clearStudentsRegistry();
    await addAuditLog(req, 'Student Deleted', `Wiped entire registered students enrollment database completely (${count} student entries purged).`);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET database backup endpoint (Librarian only)
app.get('/api/database/backup', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const backupData = await dbService.backupFullDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ramdiri_library_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST database restore endpoint (Librarian only)
app.post('/api/database/restore', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const payload = req.body;
    await dbService.restoreFullDatabase(payload);
    res.json({ success: true, message: "Database state completely restored successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// On Vercel serverless platform, connect to MongoDB automatically during function initialization
if (isVercel) {
  connectDatabase().then(() => {
    console.log("Database connection routine completed on Vercel module load.");
  }).catch(err => {
    console.error("Database connection failed on Vercel module load:", err);
  });
}

export default app;
