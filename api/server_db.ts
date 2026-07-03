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

// Copy bundled databases to writable /tmp directory if running in a serverless environment
function ensureWritableDatabaseFiles() {
  const filesToCopy = ['books.json', 'students.json', 'requests.json', 'issue_logs.json', 'audit_logs.json', 'study_materials.json'];
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
  name: { type: String, required: true },
  rollNumber: { type: Number, required: true },
  dob: { type: String, required: true }, // YYYY-MM-DD
  class: { type: String, required: true },
  section: { type: String, required: true }
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
  passwordHash: { type: String, required: true }
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

const MongoBook = (mongoose.models.Book || mongoose.model('Book', BookSchema)) as any;
const MongoStudent = (mongoose.models.Student || mongoose.model('Student', StudentSchema)) as any;
const MongoBorrowRequest = (mongoose.models.BorrowRequest || mongoose.model('BorrowRequest', BorrowRequestSchema)) as any;
const MongoBookIssueLog = (mongoose.models.BookIssueLog || mongoose.model('BookIssueLog', BookIssueLogSchema)) as any;
const MongoLibraryAuditLog = (mongoose.models.LibraryAuditLog || mongoose.model('LibraryAuditLog', LibraryAuditLogSchema)) as any;
const MongoLibrarianConfig = (mongoose.models.LibrarianConfig || mongoose.model('LibrarianConfig', LibrarianConfigSchema)) as any;
const MongoStudyMaterial = (mongoose.models.StudyMaterial || mongoose.model('StudyMaterial', StudyMaterialSchema)) as any;

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

// Local File Helper functions to operate safely with concurrency
function readLocalFile<T>(filePath: string): T[] {
  if (filePath === BOOKS_FILE && booksCache) return booksCache as T[];
  if (filePath === STUDENTS_FILE && studentsCache) return studentsCache as T[];
  if (filePath === REQUESTS_FILE && requestsCache) return requestsCache as T[];
  if (filePath === ISSUE_LOGS_FILE && issueLogsCache) return issueLogsCache as T[];
  if (filePath === AUDIT_LOGS_FILE && auditLogsCache) return auditLogsCache as T[];
  if (filePath === STUDY_MATERIALS_FILE && studyMaterialsCache) return studyMaterialsCache as T[];

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (filePath === BOOKS_FILE) booksCache = parsed;
    if (filePath === STUDENTS_FILE) studentsCache = parsed;
    if (filePath === REQUESTS_FILE) requestsCache = parsed;
    if (filePath === ISSUE_LOGS_FILE) issueLogsCache = parsed;
    if (filePath === AUDIT_LOGS_FILE) auditLogsCache = parsed;
    if (filePath === STUDY_MATERIALS_FILE) studyMaterialsCache = parsed;
    return parsed;
  } catch (err) {
    return [];
  }
}

function writeLocalFile<T>(filePath: string, data: T[]): void {
  if (filePath === BOOKS_FILE) booksCache = data;
  if (filePath === STUDENTS_FILE) studentsCache = data;
  if (filePath === REQUESTS_FILE) requestsCache = data;
  if (filePath === ISSUE_LOGS_FILE) issueLogsCache = data;
  if (filePath === AUDIT_LOGS_FILE) auditLogsCache = data;
  if (filePath === STUDY_MATERIALS_FILE) studyMaterialsCache = data;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// DATABASE SERVICE EXPORTS
export const dbService = {
  getMongoConnectionState(): boolean {
    return (mongoose.connection.readyState as number) === 1;
  },
  // BOOKS
  async getBooks(): Promise<Book[]> {
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

    return migratedBooks;
  },

  async saveBook(book: Book, isEdit?: boolean): Promise<Book> {
    // Validate copies
    if (book.totalCopies < 0 || book.availableCopies < 0) {
      throw new Error("Validation Error: Copies counts cannot be negative quantities.");
    }

    const accession = book.accessionNumber?.trim();
    if (accession && !isEdit) {
      const allBooks = await this.getBooks();
      const duplicate = allBooks.find(b => b.accessionNumber?.trim().toLowerCase() === accession.toLowerCase());
      if (duplicate) {
        throw new Error(`Data Integrity Guard: A book record already exists with Accession Number "${accession}" (Title: "${duplicate.bookName}"). Duplicate books on identical Accession Numbers are prohibited.`);
      }
    }

    if (isConnectedToMongo) {
      await MongoBook.findOneAndUpdate({ bookId: book.bookId }, book, { upsert: true, new: true });
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
      return book;
    }
  },

  async saveBooksBulk(booksList: Book[]): Promise<{ saved: Book[], skippedCount: number }> {
    const saved: Book[] = [];
    let skippedCount = 0;
    
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
        continue; // skip incomplete entries
      }
      const bIdLower = book.bookId.toLowerCase();
      const accLower = book.accessionNumber?.trim().toLowerCase();

      // Check duplicate guards
      if (existingIds.has(bIdLower) || (accLower && existingAccessions.has(accLower))) {
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

    await this.updateImportStats(booksToInsert.length);
    return { saved: booksToInsert, skippedCount };
  },

  async getDbStats() {
    let mongoConnected = isConnectedToMongo;
    let booksCount = 0;
    let studentsCount = 0;
    let requestsCount = 0;
    let issueLogsCount = 0;

    if (isConnectedToMongo) {
      try {
        booksCount = await MongoBook.countDocuments();
        studentsCount = await MongoStudent.countDocuments();
        requestsCount = await MongoBorrowRequest.countDocuments();
        issueLogsCount = await MongoBookIssueLog.countDocuments();
      } catch (err) {
        mongoConnected = false;
      }
    }
    
    // Fallback or local file count
    if (!mongoConnected) {
      booksCount = readLocalFile<any>(BOOKS_FILE).length;
      studentsCount = readLocalFile<any>(STUDENTS_FILE).length;
      requestsCount = readLocalFile<any>(REQUESTS_FILE).length;
      issueLogsCount = readLocalFile<any>(ISSUE_LOGS_FILE).length;
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
    let list: Student[] = [];
    if (isConnectedToMongo) {
      list = (await MongoStudent.find().lean()) as any[];
    } else {
      list = readLocalFile<Student>(STUDENTS_FILE);
    }
    let modified = false;
    const mapped = list.map(s => {
      const finalId = s.studentId || `${s.class.toUpperCase()}-${s.section.toUpperCase()}-${s.rollNumber}`;
      if (!s.studentId) {
        s.studentId = finalId;
        modified = true;
      }
      return s;
    });
    if (modified && !isConnectedToMongo) {
      writeLocalFile(STUDENTS_FILE, mapped);
    }
    return mapped;
  },

  async saveStudent(student: Student, isEdit?: boolean): Promise<Student> {
    // Generate/Validate unique Student ID
    if (!student.name || !student.rollNumber || !student.dob || !student.class || !student.section) {
      throw new Error("Validation Error: Student Name, Roll Number, Date of Birth, Class, and Section are absolutely required.");
    }
    if (student.rollNumber <= 0) {
      throw new Error("Validation Error: Roll Number must be a positive integer.");
    }

    const genId = `${student.class.trim().toUpperCase()}-${student.section.trim().toUpperCase()}-${student.rollNumber}`;
    student.studentId = genId;

    if (isConnectedToMongo) {
      const match = await MongoStudent.findOne({ studentId: genId });
      if (match && !isEdit) {
        throw new Error(`Data Integrity Guard: A student is already registered with Student ID "${genId}" in Class ${student.class}-${student.section}. Duplicate rolls are prohibited.`);
      }
      await MongoStudent.findOneAndUpdate({ studentId: genId }, student, { upsert: true, new: true });
      return student;
    } else {
      const studentsList = readLocalFile<Student>(STUDENTS_FILE);
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
      return student;
    }
  },

  async deleteStudent(studentId: string): Promise<boolean> {
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

  async saveStudentsBulk(students: Student[]): Promise<{ saved: Student[], skippedCount: number }> {
    const saved: Student[] = [];
    let skippedCount = 0;
    const existingIds = new Set<string>((await this.getStudents()).map(s => s.studentId));

    for (const stud of students) {
      if (!stud.name || !stud.rollNumber || !stud.dob || !stud.class || !stud.section) {
        continue; // skip incomplete rows gracefully
      }
      const genId = `${stud.class.trim().toUpperCase()}-${stud.section.trim().toUpperCase()}-${stud.rollNumber}`;
      stud.studentId = genId;

      if (existingIds.has(genId)) {
        skippedCount++;
        continue; // skip duplicates of existing student IDs
      }
      
      existingIds.add(genId);
      const output = await this.saveStudent(stud, false);
      saved.push(output);
    }
    return { saved, skippedCount };
  },

  // REQUESTS (BORROW)
  async getBorrowRequests(): Promise<BorrowRequest[]> {
    if (isConnectedToMongo) {
      return (await MongoBorrowRequest.find().lean()) as any[];
    }
    return readLocalFile<BorrowRequest>(REQUESTS_FILE);
  },

  async saveBorrowRequest(req: BorrowRequest): Promise<BorrowRequest> {
    if (isConnectedToMongo) {
      await MongoBorrowRequest.findOneAndUpdate({ id: req.id }, req, { upsert: true, new: true });
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
      return req;
    }
  },

  async updateBorrowRequestStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Hold'): Promise<BorrowRequest | null> {
    if (isConnectedToMongo) {
      const req = await MongoBorrowRequest.findOneAndUpdate({ id }, { status }, { new: true });
      return req ? (req.toObject() as any) : null;
    } else {
      const requests = readLocalFile<BorrowRequest>(REQUESTS_FILE);
      const idx = requests.findIndex(r => r.id === id);
      if (idx !== -1) {
        requests[idx].status = status;
        writeLocalFile(REQUESTS_FILE, requests);
        return requests[idx];
      }
      return null;
    }
  },

  // BOOK ISSUE LOGS (outstanding / history)
  async getIssueLogs(): Promise<BookIssueLog[]> {
    if (isConnectedToMongo) {
      return (await MongoBookIssueLog.find().lean()) as any[];
    }
    return readLocalFile<BookIssueLog>(ISSUE_LOGS_FILE);
  },

  async saveIssueLog(log: BookIssueLog): Promise<BookIssueLog> {
    if (isConnectedToMongo) {
      await MongoBookIssueLog.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
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
      return log;
    }
  },

  async getAuditLogs(): Promise<LibraryAuditLog[]> {
    if (isConnectedToMongo) {
      return (await MongoLibraryAuditLog.find().sort({ timestamp: -1 }).lean()) as any[];
    }
    const logs = readLocalFile<LibraryAuditLog>(AUDIT_LOGS_FILE);
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async saveAuditLog(log: LibraryAuditLog): Promise<LibraryAuditLog> {
    if (isConnectedToMongo) {
      await MongoLibraryAuditLog.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
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
            passwordHash: config.passwordHash 
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn("saveLibrarianConfigDb error:", err);
      }
    }
  },

  async getStudyMaterials(): Promise<any[]> {
    if (isConnectedToMongo) {
      return (await MongoStudyMaterial.find().lean()) as any[];
    }
    return readLocalFile<any>(STUDY_MATERIALS_FILE);
  },

  async saveStudyMaterial(material: any): Promise<any> {
    if (isConnectedToMongo) {
      await MongoStudyMaterial.findOneAndUpdate({ id: material.id }, material, { upsert: true, new: true });
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
      return material;
    }
  },

  async deleteStudyMaterial(id: string): Promise<boolean> {
    if (isConnectedToMongo) {
      const res = await MongoStudyMaterial.deleteOne({ id });
      return res.deletedCount > 0;
    } else {
      const list = readLocalFile<any>(STUDY_MATERIALS_FILE);
      const filtered = list.filter(m => m.id !== id);
      if (filtered.length !== list.length) {
        writeLocalFile(STUDY_MATERIALS_FILE, filtered);
        return true;
      }
      return false;
    }
  }
};
