/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Book, Student, BorrowRequest, BookIssueLog, LibraryAuditLog } from '../src/types.js';

// Fallback Folder Paths
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const BUNDLED_DB_DIR = path.join(process.cwd(), 'data', 'db');
const LOCAL_DB_DIR = isServerless ? path.join('/tmp', 'data', 'db') : BUNDLED_DB_DIR;

try {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
} catch (e) {
  console.error("Warning: Failed to create database directory:", e);
}

const BOOKS_FILE = path.join(LOCAL_DB_DIR, 'books.json');
const STUDENTS_FILE = path.join(LOCAL_DB_DIR, 'students.json');
const REQUESTS_FILE = path.join(LOCAL_DB_DIR, 'requests.json');
const ISSUE_LOGS_FILE = path.join(LOCAL_DB_DIR, 'issue_logs.json');
const AUDIT_LOGS_FILE = path.join(LOCAL_DB_DIR, 'audit_logs.json');
const STUDY_MATERIALS_FILE = path.join(LOCAL_DB_DIR, 'study_materials.json');
const FEEDBACK_FILE = path.join(LOCAL_DB_DIR, 'feedback.json');
const GALLERY_FILE = path.join(LOCAL_DB_DIR, 'gallery.json');
const CONTACT_MESSAGES_FILE = path.join(LOCAL_DB_DIR, 'contact_messages.json');
const NOTIFICATIONS_FILE = path.join(LOCAL_DB_DIR, 'notifications.json');

// Copy bundled databases to writable /tmp directory if running in a serverless environment
function ensureWritableDatabaseFiles() {
  const filesToCopy = [
    'books.json', 
    'students.json', 
    'requests.json', 
    'issue_logs.json', 
    'audit_logs.json', 
    'study_materials.json', 
    'feedback.json', 
    'gallery.json',
    'contact_messages.json',
    'notifications.json'
  ];
  for (const filename of filesToCopy) {
    const destPath = path.join(LOCAL_DB_DIR, filename);
    const srcPath = path.join(BUNDLED_DB_DIR, filename);
    
    if (!fs.existsSync(destPath)) {
      try {
        if (fs.existsSync(srcPath)) {
          const content = fs.readFileSync(srcPath, 'utf8');
          fs.writeFileSync(destPath, content);
          console.log(`Successfully bootstrapped ${filename} in dynamic writable space.`);
        } else {
          fs.writeFileSync(destPath, JSON.stringify([], null, 2));
        }
      } catch (err) {
        console.error(`Error bootstrapping backup file ${filename}:`, err);
      }
    }
  }
}

if (isServerless) {
  ensureWritableDatabaseFiles();
}

// Baseline Seeding Data to populate standard records immediately (Emptied for production readiness)
const initialBooksSeed: Book[] = [];
const initialStudentsSeed: Student[] = [];
const initialRequestsSeed: BorrowRequest[] = [];
const initialIssueLogsSeed: BookIssueLog[] = [];
const initialAuditLogsSeed: LibraryAuditLog[] = [];

// Helper to calculate due date (14 days past issue date)
function addFortnight(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

// Ensure local files exist and are initialized to empty arrays (safely wrapped in try/catch to prevent read-only crashes)
try {
  if (!fs.existsSync(BOOKS_FILE) || fs.readFileSync(BOOKS_FILE, 'utf8').trim() === '' || fs.readFileSync(BOOKS_FILE, 'utf8').includes('B001')) {
    fs.writeFileSync(BOOKS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Books):", e);
}

try {
  if (!fs.existsSync(STUDENTS_FILE) || fs.readFileSync(STUDENTS_FILE, 'utf8').trim() === '' || fs.readFileSync(STUDENTS_FILE, 'utf8').includes('Aashish')) {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Students):", e);
}

try {
  if (!fs.existsSync(REQUESTS_FILE) || fs.readFileSync(REQUESTS_FILE, 'utf8').trim() === '' || fs.readFileSync(REQUESTS_FILE, 'utf8').includes('RQ001')) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Requests):", e);
}

try {
  if (!fs.existsSync(ISSUE_LOGS_FILE) || fs.readFileSync(ISSUE_LOGS_FILE, 'utf8').trim() === '' || fs.readFileSync(ISSUE_LOGS_FILE, 'utf8').includes('LOG001')) {
    fs.writeFileSync(ISSUE_LOGS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Issue Logs):", e);
}

try {
  if (!fs.existsSync(AUDIT_LOGS_FILE) || fs.readFileSync(AUDIT_LOGS_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Audit Logs):", e);
}

try {
  if (!fs.existsSync(STUDY_MATERIALS_FILE) || fs.readFileSync(STUDY_MATERIALS_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(STUDY_MATERIALS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Study Materials):", e);
}

try {
  if (!fs.existsSync(FEEDBACK_FILE) || fs.readFileSync(FEEDBACK_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Feedback):", e);
}

try {
  if (!fs.existsSync(GALLERY_FILE) || fs.readFileSync(GALLERY_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Gallery):", e);
}

try {
  if (!fs.existsSync(NOTIFICATIONS_FILE) || fs.readFileSync(NOTIFICATIONS_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  console.warn("Operational database initialization notice (Notifications):", e);
}

// Unified MongoDB / Mongoose Configurations
const hasMongoUriOption = !!process.env.MONGODB_URI && 
                           process.env.MONGODB_URI.trim() !== "" && 
                           !process.env.MONGODB_URI.includes("placeholder") && 
                           !process.env.MONGODB_URI.includes("YOUR_");
let isConnectedToMongo = hasMongoUriOption;

// Schemas Definitions for MongoDB
const BookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true },
  bookName: { type: String, required: true },
  author: { type: String, required: true },
  publisher: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: "" },
  totalCopies: { type: Number, required: true, min: 0 },
  availableCopies: { type: Number, required: true, min: 0 },
  coverImage: { type: String, default: "" },
  accessionNumber: { type: String, default: "" },
  yearOfPublication: { type: String, default: "" },
  placeOfPublication: { type: String, default: "" },
  editor: { type: String, default: "" },
  edition: { type: String, default: "" },
  volume: { type: String, default: "" },
  pages: { type: String, default: "" },
  price: { type: String, default: "" },
  callNumber: { type: String, default: "" },
  bookNumber: { type: String, default: "" },
  source: { type: String, default: "" },
  remarks: { type: String, default: "" },
  ddcCategory: { type: String, default: "" },
  ddcNumber: { type: String, default: "" }
});

const StudyMaterialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  pdfData: { type: String, default: "" }, // Base64 representation of PDF
  pdfName: { type: String, default: "" },
  expiryDate: { type: String, required: true }, // YYYY-MM-DD
  visibleTo: { type: String, required: true }, // 'All' or a specific class grade (e.g., '10')
  createdAt: { type: String, required: true }
});

const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, default: "" },
  rollNumber: { type: Number, required: true },
  dob: { type: String, default: "" }, // YYYY-MM-DD
  class: { type: String, required: true },
  section: { type: String, required: true },
  status: { type: String, default: "" }
});

const BorrowRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  rollNumber: { type: Number, required: true },
  bookId: { type: String, required: true },
  bookName: { type: String, required: true },
  requestDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Hold'], default: 'Pending' }
});

const BookIssueLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  rollNumber: { type: Number, required: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  bookId: { type: String, required: true },
  bookName: { type: String, required: true },
  issueDate: { type: String, required: true },
  issueTime: { type: String, default: "" },
  dueDate: { type: String, required: true },
  returnDate: { type: String, default: "" },
  returnTime: { type: String, default: "" },
  status: { type: String, enum: ['Issued', 'Returned'], default: 'Issued' }
});

const LibraryAuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true }
});

const LibrarianConfigSchema = new mongoose.Schema({
  configId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  designation: { type: String, default: "" },
  biography: { type: String, default: "" },
  profilePhoto: { type: String, default: "" },
  yearsOfService: { type: String, default: "" }
});

const FeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentRole: { type: String, default: 'Student' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  type: { type: String, required: true, default: 'General' },
  comment: { type: String, required: true },
  reply: { type: String, default: "" },
  status: { type: String, enum: ['Pending', 'Approved', 'Resolved', 'Spam', 'Rejected', 'Hidden'], default: 'Pending' },
  createdAt: { type: String, required: true }
});

// Speed-optimizing production-ready database indexes
BookSchema.index({ bookId: 1 });
BookSchema.index({ bookName: 1, author: 1, category: 1 });
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ rollNumber: 1 });
StudentSchema.index({ name: 1 });
BorrowRequestSchema.index({ id: 1 });
BorrowRequestSchema.index({ rollNumber: 1 });
BorrowRequestSchema.index({ bookId: 1 });
BookIssueLogSchema.index({ id: 1 });
BookIssueLogSchema.index({ rollNumber: 1 });
BookIssueLogSchema.index({ bookId: 1 });
LibraryAuditLogSchema.index({ id: 1 });
LibraryAuditLogSchema.index({ timestamp: -1 });
LibrarianConfigSchema.index({ configId: 1 });
StudyMaterialSchema.index({ id: 1 });
StudyMaterialSchema.index({ expiryDate: 1 });
FeedbackSchema.index({ id: 1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ createdAt: -1 });

const ContactMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  rollNumber: { type: Number, required: true },
  category: { type: String, required: true, enum: ['General Question', 'Suggestion', 'Report an Issue', 'Book Recommendation', 'Other'] },
  message: { type: String, required: true },
  status: { type: String, required: true, enum: ['Unread', 'Read'], default: 'Unread' },
  createdAt: { type: String, required: true }
});
ContactMessageSchema.index({ id: 1 });
ContactMessageSchema.index({ createdAt: -1 });

const MongoBook = (mongoose.models.Book || mongoose.model('Book', BookSchema)) as any;
const MongoStudent = (mongoose.models.Student || mongoose.model('Student', StudentSchema)) as any;
const MongoBorrowRequest = (mongoose.models.BorrowRequest || mongoose.model('BorrowRequest', BorrowRequestSchema)) as any;
const MongoBookIssueLog = (mongoose.models.BookIssueLog || mongoose.model('BookIssueLog', BookIssueLogSchema)) as any;
const MongoLibraryAuditLog = (mongoose.models.LibraryAuditLog || mongoose.model('LibraryAuditLog', LibraryAuditLogSchema)) as any;
const MongoLibrarianConfig = (mongoose.models.LibrarianConfig || mongoose.model('LibrarianConfig', LibrarianConfigSchema)) as any;
const MongoStudyMaterial = (mongoose.models.StudyMaterial || mongoose.model('StudyMaterial', StudyMaterialSchema)) as any;
const MongoFeedback = (mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema)) as any;
const MongoContactMessage = (mongoose.models.ContactMessage || mongoose.model('ContactMessage', ContactMessageSchema)) as any;


const GalleryImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  caption: { type: String, default: "" },
  order: { type: Number, default: 0 },
  createdAt: { type: String, required: true }
});
GalleryImageSchema.index({ id: 1 });
GalleryImageSchema.index({ order: 1 });

const MongoGalleryImage = (mongoose.models.GalleryImage || mongoose.model('GalleryImage', GalleryImageSchema)) as any;

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  recipientRole: { type: String, required: true, enum: ['Librarian', 'Student'] },
  studentId: { type: String, default: "" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: { type: String, default: "" },
  status: { type: String, required: true, enum: ['Unread', 'Read', 'Archived'], default: 'Unread' },
  createdAt: { type: String, required: true }
});
NotificationSchema.index({ id: 1 });
NotificationSchema.index({ recipientRole: 1, studentId: 1, status: 1 });
NotificationSchema.index({ createdAt: -1 });

const MongoNotification = (mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)) as any;

let cachedConnection: Promise<any> | null = null;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === "production";
  
  const hasMongoUri = !!uri && uri.trim() !== "" && !uri.includes("placeholder") && !uri.includes("YOUR_");

  if (hasMongoUri) {
    isConnectedToMongo = true;
  }

  if ((mongoose.connection.readyState as number) === 1) {
    if (hasMongoUri) isConnectedToMongo = true;
    return;
  }

  if (cachedConnection) {
    try {
      await cachedConnection;
      if (hasMongoUri) {
        isConnectedToMongo = true;
      } else {
        isConnectedToMongo = (mongoose.connection.readyState as number) === 1;
      }
      return;
    } catch (e) {
      cachedConnection = null;
    }
  }
  
  // Safe secure diagnostic print
  console.log("------------------ VERCEL RUNTIME DIAGNOSTICS ------------------");
  console.log(`[DIAGNOSTIC] MONGODB_URI: ${uri ? `DEFINED (Length: ${uri.length}, Prefix: ${uri.substring(0, 10)}...)` : 'NOT DEFINED'}`);
  console.log(`[DIAGNOSTIC] JWT_SECRET: ${process.env.JWT_SECRET ? `DEFINED (Length: ${process.env.JWT_SECRET.length})` : 'NOT DEFINED (Using default key fallback)'}`);
  console.log(`[DIAGNOSTIC] Node Env: ${process.env.NODE_ENV}`);
  console.log(`[DIAGNOSTIC] Vercel Env: ${process.env.VERCEL === '1' ? 'TRUE' : 'FALSE'}`);
  console.log("----------------------------------------------------------------");

  if (!hasMongoUri) {
    const errorMsg = "No MONGODB_URI found in environment configuration.";
    console.log(`${errorMsg} Defaulting to local high-reliability JSON operational store.`);
    isConnectedToMongo = false;
    if (isProduction) {
      console.warn("PRODUCTION DATABASE NOTIFICATION: MongoDB URI is missing, empty, or placeholder. Defaulting gracefully to high-reliability local file storage to ensure continuous daily library operations.");
    }
    return;
  }

  try {
    // Add a connection error listener so dynamic errors don't trigger unhandled exceptions
    if (mongoose.connection.listenerCount('error') === 0) {
      mongoose.connection.on('error', (err) => {
        console.log("Database connection status note: Remote cloud database link error:", err.message);
        if (isProduction) {
          console.error("CRITICAL PRODUCTION DEPLOYMENT FAILURE: Lost connection to MongoDB database cluster in production mode.");
        }
      });
    }

    if (mongoose.connection.listenerCount('connected') === 0) {
      mongoose.connection.on('connected', () => {
        console.log("[MONGO EVENT] Connected to MongoDB Atlas Cloud.");
        isConnectedToMongo = true;
      });
    }

    if (mongoose.connection.listenerCount('disconnected') === 0) {
      mongoose.connection.on('disconnected', () => {
        console.log("[MONGO EVENT] Lost connection to MongoDB Atlas Cloud.");
        if (!hasMongoUri) {
          isConnectedToMongo = false;
        }
      });
    }

    if (mongoose.connection.listenerCount('reconnected') === 0) {
      mongoose.connection.on('reconnected', () => {
        console.log("[MONGO EVENT] Reconnected to MongoDB Atlas Cloud.");
        isConnectedToMongo = true;
      });
    }

    cachedConnection = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    await cachedConnection;
    console.log("Successfully connected to MongoDB Atlas Cloud instances.");
    isConnectedToMongo = true;

    // Try to safely drop any legacy unique index on rollNumber
    try {
      await MongoStudent.collection.dropIndex("rollNumber_1");
      console.log("Successfully dropped legacy unique rollNumber index.");
    } catch (e: any) {
      console.log("Muted index drop trace (normal if index does not exist or was already dropped):", e.message);
    }

    // Seed MongoDB from local files if empty
    const bookCount = await MongoBook.countDocuments();
    if (bookCount === 0) {
      console.log("Syncing initial seeds to MongoDB...");
      await MongoBook.insertMany(initialBooksSeed);
      await MongoStudent.insertMany(initialStudentsSeed);
      await MongoBorrowRequest.insertMany(initialRequestsSeed);
      await MongoBookIssueLog.insertMany(initialIssueLogsSeed);
      console.log("Seeding complete on Cloud Database cluster.");
    }
  } catch (error: any) {
    console.warn("MongoDB connection failed under production MONGODB_URI constraint:", error.message);
    if (!hasMongoUri) {
      isConnectedToMongo = false;
    }
    cachedConnection = null;
    throw error;
  }
}

// In-memory parsed caches to dramatically speed up server responses
let booksCache: any[] | null = null;
let studentsCache: any[] | null = null;
let requestsCache: any[] | null = null;
let issueLogsCache: any[] | null = null;
let auditLogsCache: any[] | null = null;
let studyMaterialsCache: any[] | null = null;
let feedbacksCache: any[] | null = null;
let galleryCache: any[] | null = null;
let contactMessagesCache: any[] | null = null;
let notificationsCache: any[] | null = null;

// Local File Helper functions to operate safely with concurrency
function readLocalFile<T>(filePath: string): T[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return [];
  }
}

function writeLocalFile<T>(filePath: string, data: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// DATABASE SERVICE EXPORTS
export const dbService = {
  getMongoConnectionState(): boolean {
    return (mongoose.connection.readyState as number) === 1;
  },
  // BOOKS
  async getBooks(): Promise<Book[]> {
    if (booksCache) return booksCache;
    let list: Book[];
    if (isConnectedToMongo) {
      list = (await MongoBook.find().lean()) as Book[];
    } else {
      list = readLocalFile<Book>(BOOKS_FILE);
    }
    
    // Run simple on-the-fly DDC category mapping
    const getDdcCategoryNameLocal = (ddcNumStr: string | undefined | null): string => {
      if (!ddcNumStr) return "Needs Librarian Review";
      const trimStr = String(ddcNumStr).trim();
      if (trimStr === "") return "Needs Librarian Review";
      
      const numMatch = trimStr.match(/^\d+/);
      if (!numMatch) return "Needs Librarian Review";
      
      const num = parseInt(numMatch[0], 10);
      if (isNaN(num)) return "Needs Librarian Review";
      
      if (num >= 0 && num < 100) return "000 General Works";
      if (num >= 100 && num < 200) return "100 Philosophy";
      if (num >= 200 && num < 300) return "200 Religion";
      if (num >= 300 && num < 400) return "300 Social Sciences";
      if (num >= 400 && num < 500) return "400 Language";
      if (num >= 500 && num < 600) return "500 Science";
      if (num >= 600 && num < 700) return "600 Technology";
      if (num >= 700 && num < 800) return "700 Arts";
      if (num >= 800 && num < 900) return "800 Literature";
      if (num >= 900 && num < 1000) return "900 History & Geography";
      return "Needs Librarian Review";
    };

    let logs: BookIssueLog[] = [];
    try {
      logs = await this.getIssueLogs();
    } catch (err) {
      console.error("Failed to load issue logs for books reconciliation:", err);
    }
    const activeLoans = logs.filter(l => l.status === 'Issued');
    const activeCountMap = new Map<string, number>();
    for (const loan of activeLoans) {
      const bId = loan.bookId;
      if (bId) {
        activeCountMap.set(bId, (activeCountMap.get(bId) || 0) + 1);
      }
    }

    let modified = false;
    const reconciled = list.map(book => {
      let changed = false;
      
      let ddcNum = book.ddcNumber ? book.ddcNumber.trim() : "";
      if (!ddcNum) {
        const callNum = book.callNumber || "";
        const match = callNum.trim().match(/^\d+(\.\d+)?/);
        if (match) {
          ddcNum = match[0];
          book.ddcNumber = ddcNum;
          changed = true;
        }
      }
      
      const expectedCat = getDdcCategoryNameLocal(book.ddcNumber);
      if (book.ddcCategory !== expectedCat) {
        book.ddcCategory = expectedCat;
        changed = true;
      }
      if (book.category !== expectedCat) {
        book.category = expectedCat;
        changed = true;
      }

      const activeCount = activeCountMap.get(book.bookId) || 0;
      const expectedAvailable = Math.max(0, book.totalCopies - activeCount);
      if (book.availableCopies !== expectedAvailable) {
        book.availableCopies = expectedAvailable;
        changed = true;
      }

      if (changed) modified = true;
      return book;
    });

    if (modified) {
      if (isConnectedToMongo) {
        const ops = reconciled.map(b => ({
          updateOne: {
            filter: { bookId: b.bookId },
            update: { $set: { ddcNumber: b.ddcNumber, ddcCategory: b.ddcCategory, category: b.category, availableCopies: b.availableCopies } }
          }
        }));
        MongoBook.bulkWrite(ops).catch((e: any) => console.error("On-the-fly book self-healing background save failed:", e));
      } else {
        writeLocalFile(BOOKS_FILE, reconciled);
      }
    }

    booksCache = reconciled;
    return reconciled;
  },
  async getBooksOld(): Promise<Book[]> {
    let books: Book[];
    if (isConnectedToMongo) {
      books = (await MongoBook.find().lean()) as any[];
    } else {
      books = readLocalFile<Book>(BOOKS_FILE);
    }

    const getDdcCategoryName = (ddcNumStr: string | undefined | null): string => {
      if (!ddcNumStr) return "Needs Librarian Review";
      const trimStr = String(ddcNumStr).trim();
      if (trimStr === "") return "Needs Librarian Review";
      
      const numMatch = trimStr.match(/^\d+/);
      if (!numMatch) return "Needs Librarian Review";
      
      const num = parseInt(numMatch[0], 10);
      if (isNaN(num)) return "Needs Librarian Review";
      
      if (num >= 0 && num < 100) return "000 General Works";
      if (num >= 100 && num < 200) return "100 Philosophy";
      if (num >= 200 && num < 300) return "200 Religion";
      if (num >= 300 && num < 400) return "300 Social Sciences";
      if (num >= 400 && num < 500) return "400 Language";
      if (num >= 500 && num < 600) return "500 Science";
      if (num >= 600 && num < 700) return "600 Technology";
      if (num >= 700 && num < 800) return "700 Arts";
      if (num >= 800 && num < 900) return "800 Literature";
      if (num >= 900 && num < 1000) return "900 History & Geography";
      return "Needs Librarian Review";
    };

    let migrated = false;
    const migratedBooks = books.map(book => {
      let changed = false;
      
      // Determine ddcNumber from current state or callNumber
      let ddcNum = book.ddcNumber ? book.ddcNumber.trim() : "";
      if (!ddcNum) {
        const callNum = book.callNumber || "";
        const match = callNum.trim().match(/^\d+(\.\d+)?/);
        if (match) {
          ddcNum = match[0];
        }
      }
      
      if (book.ddcNumber !== ddcNum) {
        book.ddcNumber = ddcNum;
        changed = true;
      }
      
      const expectedCat = getDdcCategoryName(book.ddcNumber);
      
      if (book.ddcCategory !== expectedCat) {
        book.ddcCategory = expectedCat;
        changed = true;
      }

      if (book.category !== expectedCat) {
        book.category = expectedCat;
        changed = true;
      }

      if (changed) {
        migrated = true;
      }
      return book;
    });

    if (migrated) {
      if (isConnectedToMongo) {
        const ops = migratedBooks.map(b => ({
          updateOne: {
            filter: { bookId: b.bookId },
            update: { $set: b },
            upsert: true
          }
        }));
        MongoBook.bulkWrite(ops).catch((e: any) => console.error("On-the-fly DDC migration background save failed:", e));
      } else {
        writeLocalFile(BOOKS_FILE, migratedBooks);
      }
    }

    // Dynamic Self-Healing & Reconciliation of available copies
    // availableCopies = totalCopies - (number of active un-returned loans in issueLogs for this bookId)
    let logs: BookIssueLog[] = [];
    try {
      logs = await this.getIssueLogs();
    } catch (err) {
      console.error("Failed to load issue logs for books reconciliation:", err);
    }
    const activeLoans = logs.filter(l => l.status === 'Issued');
    const activeCountMap = new Map<string, number>();
    for (const loan of activeLoans) {
      const bId = loan.bookId;
      if (bId) {
        activeCountMap.set(bId, (activeCountMap.get(bId) || 0) + 1);
      }
    }

    let reconciled = false;
    const reconciledBooks = migratedBooks.map(b => {
      const activeCount = activeCountMap.get(b.bookId) || 0;
      const expectedAvailable = Math.max(0, b.totalCopies - activeCount);
      if (b.availableCopies !== expectedAvailable) {
        b.availableCopies = expectedAvailable;
        reconciled = true;
      }
      return b;
    });

    if (reconciled) {
      if (isConnectedToMongo) {
        const ops = reconciledBooks.map(b => ({
          updateOne: {
            filter: { bookId: b.bookId },
            update: { $set: { availableCopies: b.availableCopies } }
          }
        }));
        MongoBook.bulkWrite(ops).catch((e: any) => console.error("On-the-fly reconciliation background save failed:", e));
      } else {
        writeLocalFile(BOOKS_FILE, reconciledBooks);
      }
    }

    return reconciledBooks;
  },

  async saveBook(book: Book, isEdit?: boolean): Promise<Book> {
    // Validate copies
    if (book.totalCopies < 0 || book.availableCopies < 0) {
      throw new Error("Validation Error: Copies counts cannot be negative quantities.");
    }

    const accession = book.accessionNumber?.trim();
    if (accession) {
      const allBooks = await this.getBooks();
      const duplicate = allBooks.find(b => 
        b.bookId !== book.bookId && 
        b.accessionNumber?.trim().toLowerCase() === accession.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Data Integrity Guard: A book record already exists with Accession Number "${accession}" (Title: "${duplicate.bookName}"). Duplicate books on identical Accession Numbers are prohibited.`);
      }
    }

    if (isConnectedToMongo) {
      await MongoBook.findOneAndUpdate({ bookId: book.bookId }, book, { upsert: true, new: true });
      booksCache = null;
      return book;
    } else {
      const books = readLocalFile<Book>(BOOKS_FILE);
      const idx = books.findIndex(b => b.bookId === book.bookId);
      if (idx !== -1) {
        books[idx] = book;
      } else {
        books.unshift(book);
      }
      writeLocalFile(BOOKS_FILE, books);
      booksCache = null;
      return book;
    }
  },

  async saveBooksBulk(booksList: Book[]): Promise<{ saved: Book[], skippedCount: number, skippedRows: { row: any; reason: string }[] }> {
    const saved: Book[] = [];
    let skippedCount = 0;
    const skippedRows: { row: any; reason: string }[] = [];
    
    // Fetch all existing books to get unique identifiers quickly
    const existingBooks = await this.getBooks();
    const existingIds = new Set<string>(existingBooks.map(b => b.bookId.toLowerCase()));
    const existingAccessions = new Set<string>(
      existingBooks
        .map(b => b.accessionNumber?.trim().toLowerCase())
        .filter((acc): acc is string => !!acc && acc !== "")
    );

    const booksToInsert: Book[] = [];

    for (const book of booksList) {
      if (!book.bookId || !book.bookName) {
        skippedRows.push({ row: book, reason: "Missing mandatory Book ID or Book Name specification." });
        continue; // skip incomplete entries
      }
      const bIdLower = book.bookId.toLowerCase();
      const accLower = book.accessionNumber?.trim().toLowerCase();

      // Check duplicate guards
      if (existingIds.has(bIdLower)) {
        skippedRows.push({ row: book, reason: `Duplicate Book ID coordinate: ${book.bookId}` });
        skippedCount++;
        continue;
      }
      if (accLower && existingAccessions.has(accLower)) {
        skippedRows.push({ row: book, reason: `Duplicate Accession Number register: ${book.accessionNumber}` });
        skippedCount++;
        continue;
      }

      existingIds.add(bIdLower);
      if (accLower) {
        existingAccessions.add(accLower);
      }

      let tc = book.totalCopies;
      let ac = book.availableCopies;
      if (tc === undefined || isNaN(tc) || tc < 0) tc = 1;
      if (ac === undefined || isNaN(ac) || ac < 0) ac = tc;

      const modifiedBook: Book = {
        ...book,
        totalCopies: tc,
        availableCopies: ac,
        description: book.description || "",
        coverImage: book.coverImage || "",
        accessionNumber: book.accessionNumber || "",
        yearOfPublication: book.yearOfPublication || "",
        placeOfPublication: book.placeOfPublication || "",
        editor: book.editor || "",
        edition: book.edition || "",
        volume: book.volume || "",
        pages: book.pages || "",
        price: book.price || "",
        callNumber: book.callNumber || "",
        bookNumber: book.bookNumber || "",
        source: book.source || "",
        remarks: book.remarks || "",
        ddcCategory: book.ddcCategory || ""
      };

      booksToInsert.push(modifiedBook);
    }

    if (skippedRows.length > 0) {
      console.warn(`[DLMS BULK IMPORT] Skipped ${skippedRows.length} book rows during validation filtering:`);
      skippedRows.forEach((item, index) => {
        console.warn(`  #${index + 1}: Name: "${item.row.bookName || 'N/A'}", ID: "${item.row.bookId || 'N/A'}", Accession: "${item.row.accessionNumber || 'N/A'}" -> Reason: ${item.reason}`);
      });
    }

    if (isConnectedToMongo) {
      const ops = booksToInsert.map(book => ({
        updateOne: {
          filter: { bookId: book.bookId },
          update: { $set: book },
          upsert: true
        }
      }));
      if (ops.length > 0) {
        await MongoBook.bulkWrite(ops);
      }
    } else {
      const books = readLocalFile<Book>(BOOKS_FILE);
      for (const b of booksToInsert) {
        books.unshift(b);
      }
      writeLocalFile(BOOKS_FILE, books);
    }

    booksCache = null;
    await this.updateImportStats(booksToInsert.length);
    return { saved: booksToInsert, skippedCount, skippedRows };
  },

  async getDbStats() {
    let mongoConnected = isConnectedToMongo;
    let booksCount = 0;
    let studentsCount = 0;
    let requestsCount = 0;
    let issueLogsCount = 0;
    let activeIssuedCount = 0;

    try {
      const bks = await this.getBooks();
      booksCount = bks.length;

      const studs = await this.getStudents();
      studentsCount = studs.length;

      const reqs = await this.getBorrowRequests();
      requestsCount = reqs.length;

      const logsList = await this.getIssueLogs();
      issueLogsCount = logsList.length;
      activeIssuedCount = logsList.filter(l => l.status === 'Issued').length;
    } catch (err) {
      mongoConnected = false;
    }

    // Load last import stats
    let lastImportDate = "Never";
    let lastImportSize = 0;
    const STATS_FILE = path.join(LOCAL_DB_DIR, 'import_stats.json');
    if (fs.existsSync(STATS_FILE)) {
      try {
        const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
        lastImportDate = stats.lastImportDate || "Never";
        lastImportSize = stats.lastImportSize || 0;
      } catch (e) {
        // ignore
      }
    }

    return {
      mongoConnected,
      booksCount,
      studentsCount,
      requestsCount,
      issueLogsCount,
      activeIssuedCount,
      lastImportDate,
      lastImportSize
    };
  },

  async updateImportStats(size: number) {
    const STATS_FILE = path.join(LOCAL_DB_DIR, 'import_stats.json');
    const stats = {
      lastImportDate: new Date().toLocaleString(),
      lastImportSize: size
    };
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
      // ignore
    }
  },

  async deleteBook(id: string): Promise<boolean> {
    booksCache = null;
    if (isConnectedToMongo) {
      const res = await MongoBook.deleteOne({ bookId: id });
      return res.deletedCount > 0;
    } else {
      const books = readLocalFile<Book>(BOOKS_FILE);
      const filtered = books.filter(b => b.bookId !== id);
      if (filtered.length !== books.length) {
        writeLocalFile(BOOKS_FILE, filtered);
        return true;
      }
      return false;
    }
  },

  async deleteBooksBulk(ids: string[]): Promise<number> {
    booksCache = null;
    if (isConnectedToMongo) {
      const res = await MongoBook.deleteMany({ bookId: { $in: ids } });
      return res.deletedCount || 0;
    } else {
      const books = readLocalFile<Book>(BOOKS_FILE);
      const filtered = books.filter(b => !ids.includes(b.bookId));
      const deletedCount = books.length - filtered.length;
      writeLocalFile(BOOKS_FILE, filtered);
      return deletedCount;
    }
  },

  async clearBooksInventory(): Promise<number> {
    booksCache = null;
    if (isConnectedToMongo) {
      const res = await MongoBook.deleteMany({});
      return res.deletedCount || 0;
    } else {
      const books = readLocalFile<Book>(BOOKS_FILE);
      const deletedCount = books.length;
      writeLocalFile(BOOKS_FILE, []);
      return deletedCount;
    }
  },

  // STUDENTS
  async getStudents(): Promise<Student[]> {
    if (studentsCache) return studentsCache;
    let list: Student[] = [];
    if (isConnectedToMongo) {
      list = (await MongoStudent.find().lean()) as any[];
    } else {
      list = readLocalFile<Student>(STUDENTS_FILE);
    }
    let modified = false;
    const mapped = list.map(s => {
      const c = s.class ? s.class.toString().trim().toUpperCase() : "10";
      const sec = s.section ? s.section.toString().trim().toUpperCase() : "A";
      const r = s.rollNumber || 1;
      const finalId = s.studentId || `${c}-${sec}-${r}`;
      if (!s.studentId) {
        s.studentId = finalId;
        modified = true;
      }
      return s;
    });
    if (modified && !isConnectedToMongo) {
      writeLocalFile(STUDENTS_FILE, mapped);
    }
    studentsCache = mapped;
    return mapped;
  },

  async saveStudent(student: Student, isEdit?: boolean, oldStudentId?: string): Promise<Student> {
    // Generate/Validate unique Student ID
    if ((!student.name && student.status !== "VACANT") || !student.rollNumber || !student.class || !student.section) {
      throw new Error("Validation Error: Student Name, Roll Number, Class, and Section are absolutely required.");
    }
    if (student.rollNumber <= 0) {
      throw new Error("Validation Error: Roll Number must be a positive integer.");
    }
    student.dob = student.dob || "";

    const genId = `${student.class.trim().toUpperCase()}-${student.section.trim().toUpperCase()}-${student.rollNumber}`;
    student.studentId = genId;

    if (isConnectedToMongo) {
      // Clean up old student record if Class/Section/Roll (and thus studentId) changed to prevent stale duplicate login blocks
      if (isEdit && oldStudentId && oldStudentId !== genId) {
        await MongoStudent.deleteOne({ studentId: oldStudentId });
      }

      const match = await MongoStudent.findOne({ studentId: genId });
      if (match && !isEdit) {
        throw new Error(`Data Integrity Guard: A student is already registered with Student ID "${genId}" in Class ${student.class}-${student.section}. Duplicate rolls are prohibited.`);
      }
      await MongoStudent.findOneAndUpdate({ studentId: genId }, student, { upsert: true, new: true });
      studentsCache = null;
      return student;
    } else {
      const studentsList = readLocalFile<Student>(STUDENTS_FILE);
      
      // Clean up old student record if Class/Section/Roll changed
      if (isEdit && oldStudentId && oldStudentId !== genId) {
        const oldIdx = studentsList.findIndex(s => s.studentId === oldStudentId);
        if (oldIdx !== -1) {
          studentsList.splice(oldIdx, 1);
        }
      }

      const idx = studentsList.findIndex(s => s.studentId === genId);
      
      if (idx !== -1) {
        if (!isEdit) {
          throw new Error(`Data Integrity Guard: A student is already registered with Student ID "${genId}" in Class ${student.class}-${student.section}. Duplicate rolls are prohibited.`);
        }
        studentsList[idx] = student;
      } else {
        studentsList.unshift(student);
      }
      writeLocalFile(STUDENTS_FILE, studentsList);
      studentsCache = null;
      return student;
    }
  },

  async deleteStudent(studentId: string): Promise<boolean> {
    studentsCache = null;
    if (isConnectedToMongo) {
      const res = await MongoStudent.deleteOne({ studentId });
      return res.deletedCount > 0;
    } else {
      const studentsList = readLocalFile<Student>(STUDENTS_FILE);
      const filtered = studentsList.filter(s => s.studentId !== studentId);
      if (filtered.length !== studentsList.length) {
        writeLocalFile(STUDENTS_FILE, filtered);
        return true;
      }
      return false;
    }
  },

  async deleteStudentsBulk(ids: string[]): Promise<number> {
    studentsCache = null;
    if (isConnectedToMongo) {
      const res = await MongoStudent.deleteMany({ studentId: { $in: ids } });
      return res.deletedCount || 0;
    } else {
      const studentsList = readLocalFile<Student>(STUDENTS_FILE);
      const filtered = studentsList.filter(s => !ids.includes(s.studentId));
      const deletedCount = studentsList.length - filtered.length;
      writeLocalFile(STUDENTS_FILE, filtered);
      return deletedCount;
    }
  },

  async clearStudentsRegistry(): Promise<number> {
    studentsCache = null;
    if (isConnectedToMongo) {
      const res = await MongoStudent.deleteMany({});
      return res.deletedCount || 0;
    } else {
      const studentsList = readLocalFile<Student>(STUDENTS_FILE);
      const deletedCount = studentsList.length;
      writeLocalFile(STUDENTS_FILE, []);
      return deletedCount;
    }
  },

  async saveStudentsBulk(students: Student[]): Promise<{ saved: Student[], skippedCount: number, updatedCount: number, errorCount: number, errors: string[] }> {
    const saved: Student[] = [];
    let skippedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const allStudents = await this.getStudents();
    const studentMap = new Map<string, Student>();
    for (const s of allStudents) {
      if (s.studentId) {
        studentMap.set(s.studentId.toUpperCase(), s);
      }
    }

    for (const stud of students) {
      if ((!stud.name && stud.status !== "VACANT") || !stud.rollNumber || !stud.class || !stud.section) {
        errorCount++;
        errors.push(`Row missing required fields for student: ${stud.name || 'Unknown'}`);
        continue;
      }
      stud.dob = stud.dob || "";
      const genId = `${stud.class.trim().toUpperCase()}-${stud.section.trim().toUpperCase()}-${stud.rollNumber}`;
      stud.studentId = genId;

      try {
        if (studentMap.has(genId.toUpperCase())) {
          // Update the existing student record instead of failing or throwing an error!
          await this.saveStudent(stud, true);
          updatedCount++;
        } else {
          const output = await this.saveStudent(stud, false);
          saved.push(output);
          studentMap.set(genId.toUpperCase(), output);
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`Failed to import student "${stud.name}" (Roll: ${stud.rollNumber}, Class: ${stud.class}-${stud.section}): ${err.message}`);
        console.error("Bulk save individual student record failure:", err);
      }
    }

    // Clear caches
    studentsCache = null;

    return { saved, skippedCount, updatedCount, errorCount, errors };
  },

  // REQUESTS (BORROW)
  async getBorrowRequests(): Promise<BorrowRequest[]> {
    if (requestsCache) return requestsCache;
    let list: BorrowRequest[];
    if (isConnectedToMongo) {
      list = (await MongoBorrowRequest.find().lean()) as any[];
    } else {
      list = readLocalFile<BorrowRequest>(REQUESTS_FILE);
    }
    requestsCache = list;
    return list;
  },

  async saveBorrowRequest(req: BorrowRequest): Promise<BorrowRequest> {
    if (isConnectedToMongo) {
      await MongoBorrowRequest.findOneAndUpdate({ id: req.id }, req, { upsert: true, new: true });
      requestsCache = null;
      return req;
    } else {
      const requests = readLocalFile<BorrowRequest>(REQUESTS_FILE);
      const idx = requests.findIndex(r => r.id === req.id);
      if (idx !== -1) {
        requests[idx] = req;
      } else {
        requests.unshift(req);
      }
      writeLocalFile(REQUESTS_FILE, requests);
      requestsCache = null;
      return req;
    }
  },

  async updateBorrowRequestStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Hold'): Promise<BorrowRequest | null> {
    if (isConnectedToMongo) {
      const req = await MongoBorrowRequest.findOneAndUpdate({ id }, { status }, { new: true });
      requestsCache = null;
      return req ? (req.toObject() as any) : null;
    } else {
      const requests = readLocalFile<BorrowRequest>(REQUESTS_FILE);
      const idx = requests.findIndex(r => r.id === id);
      if (idx !== -1) {
        requests[idx].status = status;
        writeLocalFile(REQUESTS_FILE, requests);
        requestsCache = null;
        return requests[idx];
      }
      return null;
    }
  },

  // BOOK ISSUE LOGS (outstanding / history)
  async getIssueLogs(): Promise<BookIssueLog[]> {
    if (issueLogsCache) return issueLogsCache;
    let list: BookIssueLog[];
    if (isConnectedToMongo) {
      list = (await MongoBookIssueLog.find().lean()) as any[];
    } else {
      list = readLocalFile<BookIssueLog>(ISSUE_LOGS_FILE);
    }
    issueLogsCache = list;
    return list;
  },

  async saveIssueLog(log: BookIssueLog): Promise<BookIssueLog> {
    if (isConnectedToMongo) {
      await MongoBookIssueLog.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
      issueLogsCache = null;
      booksCache = null; // Reconciles copies too!
      return log;
    } else {
      const lgs = readLocalFile<BookIssueLog>(ISSUE_LOGS_FILE);
      const idx = lgs.findIndex(l => l.id === log.id);
      if (idx !== -1) {
        lgs[idx] = log;
      } else {
        lgs.unshift(log);
      }
      writeLocalFile(ISSUE_LOGS_FILE, lgs);
      issueLogsCache = null;
      booksCache = null; // Reconciles copies too!
      return log;
    }
  },

  async getAuditLogs(): Promise<LibraryAuditLog[]> {
    if (auditLogsCache) return auditLogsCache;
    let list: LibraryAuditLog[];
    if (isConnectedToMongo) {
      list = (await MongoLibraryAuditLog.find().sort({ timestamp: -1 }).lean()) as any[];
    } else {
      list = readLocalFile<LibraryAuditLog>(AUDIT_LOGS_FILE);
    }
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    auditLogsCache = list;
    return list;
  },

  async saveAuditLog(log: LibraryAuditLog): Promise<LibraryAuditLog> {
    if (isConnectedToMongo) {
      await MongoLibraryAuditLog.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
      auditLogsCache = null;
      return log;
    } else {
      const logs = readLocalFile<LibraryAuditLog>(AUDIT_LOGS_FILE);
      const idx = logs.findIndex(l => l.id === log.id);
      if (idx !== -1) {
        logs[idx] = log;
      } else {
        logs.unshift(log);
      }
      writeLocalFile(AUDIT_LOGS_FILE, logs);
      auditLogsCache = null;
      return log;
    }
  },

  async backupFullDatabase(): Promise<any> {
    const books = await this.getBooks();
    const students = await this.getStudents();
    const requests = await this.getBorrowRequests();
    const issueLogs = await this.getIssueLogs();
    
    return {
      version: "1.0",
      backupTime: new Date().toISOString(),
      books,
      students,
      requests,
      issueLogs
    };
  },

  async restoreFullDatabase(payload: any): Promise<boolean> {
    if (!payload || typeof payload !== 'object') {
      throw new Error("Invalid backup payload format.");
    }
    const { books, students, requests, issueLogs } = payload;
    if (!Array.isArray(books) || !Array.isArray(students) || !Array.isArray(requests) || !Array.isArray(issueLogs)) {
      throw new Error("Invalid backup schema structure. Required data tables are missing.");
    }

    if (isConnectedToMongo) {
      await MongoBook.deleteMany({});
      if (books.length > 0) await MongoBook.insertMany(books);

      await MongoStudent.deleteMany({});
      if (students.length > 0) await MongoStudent.insertMany(students);

      await MongoBorrowRequest.deleteMany({});
      if (requests.length > 0) await MongoBorrowRequest.insertMany(requests);

      await MongoBookIssueLog.deleteMany({});
      if (issueLogs.length > 0) await MongoBookIssueLog.insertMany(issueLogs);
    } else {
      writeLocalFile(BOOKS_FILE, books);
      writeLocalFile(STUDENTS_FILE, students);
      writeLocalFile(REQUESTS_FILE, requests);
      writeLocalFile(ISSUE_LOGS_FILE, issueLogs);
    }

    booksCache = null;
    studentsCache = null;
    requestsCache = null;
    issueLogsCache = null;
    auditLogsCache = null;
    studyMaterialsCache = null;
    feedbacksCache = null;
    galleryCache = null;
    contactMessagesCache = null;
    notificationsCache = null;

    return true;
  },

  async getLibrarianConfigDb(): Promise<any | null> {
    if (isConnectedToMongo) {
      try {
        return await MongoLibrarianConfig.findOne({ configId: "primary" }).lean();
      } catch (err) {
        console.warn("getLibrarianConfigDb error:", err);
      }
    }
    return null;
  },

  async saveLibrarianConfigDb(config: any): Promise<void> {
    if (isConnectedToMongo) {
      try {
        await MongoLibrarianConfig.findOneAndUpdate(
          { configId: "primary" },
          { 
            configId: "primary", 
            username: config.username, 
            name: config.name, 
            passwordHash: config.passwordHash,
            designation: config.designation || "",
            biography: config.biography || "",
            profilePhoto: config.profilePhoto || "",
            yearsOfService: config.yearsOfService || ""
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn("saveLibrarianConfigDb error:", err);
      }
    }
  },

  async getStudyMaterials(): Promise<any[]> {
    if (studyMaterialsCache) return studyMaterialsCache;
    let list: any[];
    if (isConnectedToMongo) {
      list = (await MongoStudyMaterial.find().lean()) as any[];
    } else {
      list = readLocalFile<any>(STUDY_MATERIALS_FILE);
    }
    studyMaterialsCache = list;
    return list;
  },

  async saveStudyMaterial(material: any): Promise<any> {
    if (isConnectedToMongo) {
      await MongoStudyMaterial.findOneAndUpdate({ id: material.id }, material, { upsert: true, new: true });
      studyMaterialsCache = null;
      return material;
    } else {
      const list = readLocalFile<any>(STUDY_MATERIALS_FILE);
      const idx = list.findIndex(m => m.id === material.id);
      if (idx !== -1) {
        list[idx] = material;
      } else {
        list.unshift(material);
      }
      writeLocalFile(STUDY_MATERIALS_FILE, list);
      studyMaterialsCache = null;
      return material;
    }
  },

  async deleteStudyMaterial(id: string): Promise<boolean> {
    if (isConnectedToMongo) {
      const res = await MongoStudyMaterial.deleteOne({ id });
      studyMaterialsCache = null;
      return res.deletedCount > 0;
    } else {
      const list = readLocalFile<any>(STUDY_MATERIALS_FILE);
      const filtered = list.filter(m => m.id !== id);
      if (filtered.length !== list.length) {
        writeLocalFile(STUDY_MATERIALS_FILE, filtered);
        studyMaterialsCache = null;
        return true;
      }
      return false;
    }
  },

  async getFeedbacks(): Promise<any[]> {
    if (feedbacksCache) return feedbacksCache;
    let list: any[];
    if (isConnectedToMongo) {
      list = (await MongoFeedback.find().lean()) as any[];
    } else {
      list = readLocalFile<any>(FEEDBACK_FILE);
    }
    feedbacksCache = list;
    return list;
  },

  async saveFeedback(feedback: any): Promise<any> {
    if (isConnectedToMongo) {
      await MongoFeedback.findOneAndUpdate({ id: feedback.id }, feedback, { upsert: true, new: true });
      feedbacksCache = null;
      return feedback;
    } else {
      const list = readLocalFile<any>(FEEDBACK_FILE);
      const idx = list.findIndex(f => f.id === feedback.id);
      if (idx !== -1) {
        list[idx] = feedback;
      } else {
        list.unshift(feedback);
      }
      writeLocalFile(FEEDBACK_FILE, list);
      feedbacksCache = null;
      return feedback;
    }
  },

  async deleteFeedback(id: string): Promise<boolean> {
    if (isConnectedToMongo) {
      const res = await MongoFeedback.deleteOne({ id });
      feedbacksCache = null;
      return res.deletedCount > 0;
    } else {
      const list = readLocalFile<any>(FEEDBACK_FILE);
      const filtered = list.filter(f => f.id !== id);
      if (filtered.length !== list.length) {
        writeLocalFile(FEEDBACK_FILE, filtered);
        feedbacksCache = null;
        return true;
      }
      return false;
    }
  },

  async getGalleryImages(): Promise<any[]> {
    if (galleryCache) return galleryCache;
    let list: any[];
    if (isConnectedToMongo) {
      list = (await MongoGalleryImage.find().sort({ order: 1 }).lean()) as any[];
    } else {
      const rawList = readLocalFile<any>(GALLERY_FILE);
      list = rawList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    }
    galleryCache = list;
    return list;
  },

  async saveGalleryImages(images: any[]): Promise<any[]> {
    if (isConnectedToMongo) {
      await MongoGalleryImage.deleteMany({});
      if (images.length > 0) {
        await MongoGalleryImage.insertMany(images);
      }
      galleryCache = null;
      return images;
    } else {
      writeLocalFile(GALLERY_FILE, images);
      galleryCache = null;
      return images;
    }
  },

  async getContactMessages(): Promise<any[]> {
    if (contactMessagesCache) return contactMessagesCache;
    let list: any[];
    if (isConnectedToMongo) {
      list = (await MongoContactMessage.find().lean()) as any[];
    } else {
      list = readLocalFile<any>(CONTACT_MESSAGES_FILE);
    }
    // Sort by newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    contactMessagesCache = list;
    return list;
  },

  async saveContactMessage(msg: any): Promise<any> {
    if (isConnectedToMongo) {
      await MongoContactMessage.findOneAndUpdate({ id: msg.id }, msg, { upsert: true, new: true });
      contactMessagesCache = null;
      return msg;
    } else {
      const list = readLocalFile<any>(CONTACT_MESSAGES_FILE);
      const idx = list.findIndex(m => m.id === msg.id);
      if (idx !== -1) {
        list[idx] = msg;
      } else {
        list.push(msg);
      }
      writeLocalFile(CONTACT_MESSAGES_FILE, list);
      contactMessagesCache = null;
      return msg;
    }
  },

  async deleteContactMessage(id: string): Promise<boolean> {
    if (isConnectedToMongo) {
      const res = await MongoContactMessage.deleteOne({ id });
      contactMessagesCache = null;
      return res.deletedCount > 0;
    } else {
      const list = readLocalFile<any>(CONTACT_MESSAGES_FILE);
      const filtered = list.filter(m => m.id !== id);
      if (filtered.length !== list.length) {
        writeLocalFile(CONTACT_MESSAGES_FILE, filtered);
        contactMessagesCache = null;
        return true;
      }
      return false;
    }
  },

  async getNotifications(): Promise<any[]> {
    if (notificationsCache) return notificationsCache;
    let list: any[];
    if (isConnectedToMongo) {
      list = (await MongoNotification.find().lean()) as any[];
    } else {
      list = readLocalFile<any>(NOTIFICATIONS_FILE);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    notificationsCache = list;
    return list;
  },

  async saveNotification(notification: any): Promise<any> {
    if (isConnectedToMongo) {
      await MongoNotification.findOneAndUpdate({ id: notification.id }, notification, { upsert: true, new: true });
      notificationsCache = null;
      return notification;
    } else {
      const list = readLocalFile<any>(NOTIFICATIONS_FILE);
      const idx = list.findIndex((n: any) => n.id === notification.id);
      if (idx !== -1) {
        list[idx] = notification;
      } else {
        list.push(notification);
      }
      writeLocalFile(NOTIFICATIONS_FILE, list);
      notificationsCache = null;
      return notification;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    if (isConnectedToMongo) {
      const res = await MongoNotification.deleteOne({ id });
      notificationsCache = null;
      return res.deletedCount > 0;
    } else {
      const list = readLocalFile<any>(NOTIFICATIONS_FILE);
      const filtered = list.filter((n: any) => n.id !== id);
      if (filtered.length !== list.length) {
        writeLocalFile(NOTIFICATIONS_FILE, filtered);
        notificationsCache = null;
        return true;
      }
      return false;
    }
  }
};
