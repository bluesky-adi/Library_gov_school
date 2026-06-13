/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, dbService } from './server_db';
import { Book, Student, BorrowRequest, BookIssueLog } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent JSON storage path for Librarian account credentials
const CONFIG_PATH = path.join(process.cwd(), 'librarian_v2_credentials.json');

// Initialize secure credentials
if (!fs.existsSync(CONFIG_PATH)) {
  const initialConfig = {
    username: "ramdiri_admin_roy",
    passwordHash: bcrypt.hashSync("LibrarianSecureBegusarai2026!", 10)
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(initialConfig, null, 2));
}

function getLibrarianConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    return {
      username: "ramdiri_admin_roy",
      passwordHash: bcrypt.hashSync("LibrarianSecureBegusarai2026!", 10)
    };
  }
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
  const { username, password, rollNumber, dob, role } = req.body;

  if (role === 'Librarian') {
    const activeConfig = getLibrarianConfig();
    const isCorrectUser = username?.toLowerCase().trim() === activeConfig.username.toLowerCase().trim();
    const isCorrectPass = password && bcrypt.compareSync(password, activeConfig.passwordHash);

    if (isCorrectUser && isCorrectPass) {
      const token = jwt.sign(
        { role: 'Librarian', username: activeConfig.username, name: "S. K. Roy (Chief Librarian)" },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({
        success: true,
        token,
        role: 'Librarian'
      });
    } else {
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

    const studentsList = await dbService.getStudents();
    const matched = studentsList.find(
      (s: Student) => s.rollNumber === roll && toStandardDate(s.dob) === inputDobStandard
    );

    if (matched) {
      const token = jwt.sign(
        { role: 'Student', rollNumber: roll, name: matched.name },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({
        success: true,
        token,
        role: 'Student',
        student: matched
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication Failed: Roll Number and DOB do not match school records." 
      });
    }
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

app.post('/api/auth/change-credentials', authenticateToken, requireLibrarian, (req, res) => {
  const { oldPassword, newUsername, newPassword } = req.body;

  if (!oldPassword || !newUsername || !newPassword) {
    return res.status(400).json({ success: false, error: 'All fields are required: Old Password, New Username, New Password' });
  }

  const activeConfig = getLibrarianConfig();
  const isPassCorrect = bcrypt.compareSync(oldPassword, activeConfig.passwordHash);

  if (!isPassCorrect) {
    return res.status(401).json({ success: false, error: 'Incorrect current password credential' });
  }

  if (newPassword.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters in length' });
  }

  const updatedConfig = {
    username: newUsername.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(newPassword, 10)
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
  res.json({ success: true, message: 'Chief Librarian access credentials updated successfully' });
});


// ---- BOOKS REST API ENDPOINTS ----
app.get('/api/books', async (req, res) => {
  try {
    const books = await dbService.getBooks();
    res.json(books);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const newBook = await dbService.saveBook(req.body);
    res.status(201).json(newBook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/books/:id', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const updatedBook = await dbService.saveBook({ ...req.body, bookId: req.params.id });
    res.json(updatedBook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/books/:id', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const success = await dbService.deleteBook(req.params.id);
    res.json({ success });
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
    const newStudent = await dbService.saveStudent(req.body);
    res.status(201).json(newStudent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/students/bulk', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    const records: Student[] = req.body.students;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid student bulk upload content." });
    }
    const saved = await dbService.saveStudentsBulk(records);
    res.json({ success: true, count: saved.length, records: saved });
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
    const due = new Date();
    due.setDate(due.getDate() + 14); // 2 weeks duration
    const dueDateStr = due.toISOString().split('T')[0];

    const issueLog: BookIssueLog = {
      id: `LOG-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
      studentName: borrowReq.studentName,
      rollNumber: borrowReq.rollNumber,
      class: studClass,
      section: studSection,
      bookId: borrowReq.bookId,
      bookName: borrowReq.bookName,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      status: 'Issued'
    };

    const savedLog = await dbService.saveIssueLog(issueLog);
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
    await dbService.saveIssueLog(log);

    // Replenish copies count
    const books = await dbService.getBooks();
    const book = books.find(b => b.bookId === log.bookId);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      await dbService.saveBook(book);
    }

    res.json({ success: true, log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ---- SYSTEM DATABASE RESET CONTROL ROUTE ----
app.post('/api/database/reset', authenticateToken, requireLibrarian, async (req, res) => {
  try {
    // Reset all files or tables to baseline seed
    const LOCAL_DB_DIR = path.join(process.cwd(), 'data', 'db');
    
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

    fs.writeFileSync(BOOKS_FILE, JSON.stringify(seedBooksDefault, null, 2));
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(seedStudentsDefault, null, 2));
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(seedRequestsDefault, null, 2));
    fs.writeFileSync(ISSUE_LOGS_FILE, JSON.stringify(seedLogsDefault, null, 2));

    res.json({ success: true, message: "School academic records factory reseeded seamlessly." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Compile Vite assets or configure production fallback route
async function initServer() {
  // Connect database on boot
  await connectDatabase();

  if (process.env.NODE_ENV !== 'production') {
    console.log("Loading Vite Dev Middlewares on Port 3000...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving Production Compiles from dist/");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ramdiri Portal server active running on http://localhost:${PORT}`);
  });
}

initServer().catch(err => {
  console.error("Critical server startup fault:", err);
});
