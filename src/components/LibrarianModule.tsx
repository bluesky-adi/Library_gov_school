/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Book, Student, BorrowRequest, BookIssueLog } from '../types';
import ExcelModule from './ExcelModule';
import { GoogleBookCover } from './PublicHome';
import { 
  PlusCircle, Edit, Trash2, CheckCircle, XCircle, FileText, FolderPlus,
  BookOpen, Users, ClipboardCheck, Printer, Search, Download, AlertTriangle, ArrowUpRight,
  Key, Eye, EyeOff, Shield, Sliders, AlertCircle, User
} from 'lucide-react';

interface LibrarianModuleProps {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  currentLang: 'EN' | 'HI';
  onAddBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onReturnBook: (logId: string) => void;
  onAddRequest: (req: BorrowRequest) => void;
  onImportBooksExcel: (books: Book[]) => void;
  onImportStudentsExcel: (students: Student[]) => void;
}

export default function LibrarianModule({
  books,
  students,
  requests,
  issueLogs,
  currentLang,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onApproveRequest,
  onRejectRequest,
  onReturnBook,
  onAddRequest,
  onImportBooksExcel,
  onImportStudentsExcel
}: LibrarianModuleProps) {
  // Tabs config
  const [activeTab, setActiveTab] = useState<'books' | 'students' | 'requests' | 'reports' | 'security'>('books');
  const [bookSearch, setBookSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Active Report sub-tab ('inventory' | 'loans' | 'students')
  const [activeReport, setActiveReport] = useState<'inventory' | 'loans' | 'students'>('inventory');

  // Manual Book state
  const [showBookForm, setShowBookForm] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  // Fields for manual book adding/editing
  const [formName, setFormName] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formCategory, setFormCategory] = useState('Academic');
  const [formDescription, setFormDescription] = useState('');
  const [formCopies, setFormCopies] = useState<number>(5);

  // Manual issue walk-in desk check
  const [walkinRoll, setWalkinRoll] = useState<string>('');
  const [walkinBookId, setWalkinBookId] = useState<string>('');
  const [walkinBookSearchQuery, setWalkinBookSearchQuery] = useState<string>('');

  // Selected student for profile history modal view
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);

  // Security Form States
  const [newUsername, setNewUsername] = useState<string>('');
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [secError, setSecError] = useState<string | null>(null);
  const [secSuccess, setSecSuccess] = useState<string | null>(null);
  const [secLoading, setSecLoading] = useState<boolean>(false);

  // Categories expansion state persistence
  const defaultCategories = useMemo(() => [
    'Academic', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'English', 'Hindi', 'History', 'Geography', 'Political Science',
    'Economics', 'Commerce', 'Literature', 'General Knowledge', 'Arts & Culture',
    'Self Help', 'Biography', 'Competitive Exams', 'Technology', 'Fiction', 'Non-Fiction'
  ], []);

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("ramdiri_custom_categories");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return defaultCategories; }
    }
    return defaultCategories;
  });

  useEffect(() => {
    localStorage.setItem("ramdiri_custom_categories", JSON.stringify(categories));
  }, [categories, defaultCategories]);

  // Unified Database Connection Status tracking
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    mode: string;
    uriPresent: boolean;
    maskedUri: string;
  } | null>(null);
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  const fetchDbStatus = () => {
    setDbLoading(true);
    fetch('/api/database/status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => console.error("Error fetching database status info:", err))
      .finally(() => setDbLoading(false));
  };

  useEffect(() => {
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 15000); // Poll status every 15s to ensure accuracy 
    return () => clearInterval(interval);
  }, []);

  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Issued Details Modal state
  const [showIssuedModal, setShowIssuedModal] = useState<boolean>(false);
  const [issuedModalFilter, setIssuedModalFilter] = useState<'Issued' | 'Returned' | 'Overdue'>('Issued');

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecSuccess(null);

    if (!newUsername.trim()) {
      setSecError("Username is required.");
      return;
    }
    if (newPassword.length < 6) {
      setSecError("New password must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecError("New password and confirmation password do not match.");
      return;
    }

    setSecLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");

    fetch('/api/auth/change-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPassword,
        newUsername,
        newPassword
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSecSuccess("Administrative credentials updated successfully! Core configurations updated.");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSecError(data.error || "Unable to update administrative credentials.");
      }
    })
    .catch(() => {
      setSecError("Network connection fault. Unable to submit credentials to server.");
    })
    .finally(() => {
      setSecLoading(false);
    });
  };

  const t = {
    EN: {
      metricsTotal: "Total Books Ledger",
      metricsAvail: "Available Books on Shelf",
      metricsIssued: "Issued Books",
      metricsPend: "Pending Requests",
      tabBooks: "Books Catalog",
      tabStudents: "Students Database",
      tabRequests: "Requests & Returns",
      tabReports: "Printable Reports",
      addBookBtn: "Add Book Manually",
      editBookTitle: "Edit Book Specifications",
      addBookTitle: "Register New Library Book",
      saveBtn: "Save Record",
      cancel: "Cancel",
      formBookName: "Book Name / Title",
      formAuthor: "Author Name",
      formPublisher: "Publisher / Press",
      formCategory: "Category",
      formDescription: "Brief Book Description",
      formCopies: "Total Copies Quantity",
      bookSearchPlaceholder: "Search by book name, author, publisher, category...",
      studentSearchPlaceholder: "Search student by name, roll call, class, section...",
      manualIssueTitle: "Direct Desk Issue (Walk-In Student)",
      manualIssueRoll: "Student Roll #",
      manualIssueBook: "Select Book to Issue",
      issueSubmit: "Issue Book Directly",
      noPenRequests: "Zero pending borrow requests currently.",
      activeLoansHeadline: "Active Outstanding Loans Pool",
      returnsAction: "Log Return Checks",
      excelModuleTitle: "Excel Spreadsheets Bulk Loader Console"
    },
    HI: {
      metricsTotal: "कुल पंजीकृत पुस्तकें",
      metricsAvail: "उपलब्ध शेल्फ पुस्तकें",
      metricsIssued: "जारी की गई पुस्तकें",
      metricsPend: "लंबित अनुरोध परीक्षा",
      tabBooks: "पुस्तकें सूचीकरण",
      tabStudents: "छात्र डेटाबेस",
      tabRequests: "अनुरोध एवं वापसी",
      tabReports: "रिपोर्ट प्रिंटर",
      addBookBtn: "मैन्युअल पुस्तक जोड़ें",
      editBookTitle: "पुस्तक विवरण संशोधित करें",
      addBookTitle: "नई पुस्तक दर्ज करें",
      saveBtn: "विवरण सहेजें",
      cancel: "रद्द करें",
      formBookName: "पुस्तक का शीर्षक",
      formAuthor: "लेखक का नाम",
      formPublisher: "प्रकाशक / प्रेस",
      formCategory: "श्रेणी",
      formDescription: "पुस्तक का संक्षिप्त विवरण",
      formCopies: "कुल प्रतियों की संख्या",
      bookSearchPlaceholder: "पुस्तक का नाम, लेखक, प्रकाशक या श्रेणी खोजें...",
      studentSearchPlaceholder: "छात्र का नाम, रॉल नंबर, कक्षा खोजें...",
      manualIssueTitle: "सीधा डेस्क चेकआउट (आगंतुक छात्र)",
      manualIssueRoll: "छात्र रॉल नंबर",
      manualIssueBook: "जारी करने के लिए पुस्तक चुनें",
      issueSubmit: "सीधे पुस्तक जारी करें",
      noPenRequests: "वर्तमान में कोई लंबित अनुरोध नहीं है।",
      activeLoansHeadline: "सक्रिय लोन पर चल रही पुस्तकें",
      returnsAction: "पुस्तक वापसी दर्ज करें",
      excelModuleTitle: "एक्सेल स्प्रेडशीट थोक आयात कंसोल"
    }
  }[currentLang];

  // Overdue returns evaluation logic helpers
  const isOverdue = (dueDateStr: string): boolean => {
    if (!dueDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return today.getTime() > due.getTime();
  };

  const getDaysOverdue = (dueDateStr: string): number => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    return diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
  };

  // Resolve Student demographic particulars from roll number
  const getStudentProfile = (rollNumber: number) => {
    const s = students.find(stud => stud.rollNumber === rollNumber);
    return {
      name: s?.name || "Student Reader",
      class: s?.class || "10",
      section: s?.section || "A"
    };
  };

  // KPI calculations
  const totalBookCopies = books.reduce((sum, b) => sum + b.totalCopies, 0);
  const totalAvailableCopies = books.reduce((sum, b) => sum + b.availableCopies, 0);
  const totalIssuedCopies = Math.max(0, totalBookCopies - totalAvailableCopies);
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;

  // Active Loans status Issued List
  const activeLoans = useMemo(() => {
    return issueLogs.filter(log => log.status === 'Issued');
  }, [issueLogs]);

  // General Overdue Logs list
  const overdueLogs = useMemo(() => {
    return activeLoans.filter(log => isOverdue(log.dueDate));
  }, [activeLoans]);

  // FUZZY SEARCH INITIALIZATION: Books catalogue
  const fuseBooks = useMemo(() => {
    return new Fuse(books, {
      keys: ['bookName', 'author', 'publisher', 'category'],
      threshold: 0.35,
      ignoreLocation: true
    });
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return books;
    return fuseBooks.search(bookSearch).map(res => res.item);
  }, [books, bookSearch, fuseBooks]);

  // FUZZY SEARCH INITIALIZATION: Students database
  const fuseStudents = useMemo(() => {
    return new Fuse(students, {
      keys: ['name', 'rollNumber', 'class', 'section'],
      threshold: 0.35,
      ignoreLocation: true
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    return fuseStudents.search(studentSearch).map(res => res.item);
  }, [students, studentSearch, fuseStudents]);

  // Instant fuzzy filtering for walk-in circulation selection desk
  const filteredWalkinBooks = useMemo(() => {
    if (!walkinBookSearchQuery.trim()) return [];
    const q = walkinBookSearchQuery.toLowerCase().trim();
    return books.filter(b => 
      b.availableCopies > 0 && (
        b.bookName.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      )
    );
  }, [books, walkinBookSearchQuery]);

  // Handle direct manual checkout submitting
  const handleManualIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roll = parseInt(walkinRoll);
    if (!walkinRoll || isNaN(roll)) {
      alert(currentLang === 'EN' ? "Please enter a valid Roll Number." : "कृपया एक मान्य रॉल नंबर दर्ज करें।");
      return;
    }
    if (!walkinBookId) {
      alert(currentLang === 'EN' ? "Please select a book to issue." : "कृपया जारी करने के लिए एक पुस्तक चुनें।");
      return;
    }

    const matchedStudent = students.find(s => s.rollNumber === roll);
    if (!matchedStudent) {
      alert(currentLang === 'EN' 
        ? "Failure: Student with this Roll Number is not registered in school records. Please import students first."
        : "विफलता: इस रॉल नंबर का छात्र स्कूल डेटाबेस में पंजीकृत नहीं है। कृपया पहले छात्र सूची आयात करें।"
      );
      return;
    }

    const matchedBook = books.find(b => b.bookId === walkinBookId);
    if (!matchedBook) return;

    if (matchedBook.availableCopies <= 0) {
      alert(currentLang === 'EN' ? "Selected book is out-of-stock." : "चुनी हुई पुस्तक अभी स्टॉक में नहीं है।");
      return;
    }

    const mockRequest: BorrowRequest = {
      id: `RQ-MAN-${Date.now().toString().slice(-4)}`,
      studentName: matchedStudent.name,
      rollNumber: matchedStudent.rollNumber,
      bookId: matchedBook.bookId,
      bookName: matchedBook.bookName,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Approved' 
    };

    onAddRequest(mockRequest);
    onApproveRequest(mockRequest.id);

    setWalkinRoll('');
    setWalkinBookId('');
    setWalkinBookSearchQuery('');
    alert(currentLang === 'EN' 
      ? `Successfully issued '${matchedBook.bookName}' to student '${matchedStudent.name}'!` 
      : `'${matchedBook.bookName}' सफलतापूर्वक छात्र '${matchedStudent.name}' को जारी कर दी गयी!`
    );
  };

  const handleBookFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAuthor.trim() || !formPublisher.trim()) {
      alert("Please fill in Book Name, Author and Publisher.");
      return;
    }

    const copies = parseInt(formCopies.toString()) || 1;

    if (editingBook) {
      onEditBook({
        ...editingBook,
        bookName: formName,
        author: formAuthor,
        publisher: formPublisher,
        category: formCategory,
        description: formDescription || "Standard Academic handbook.",
        totalCopies: copies,
        availableCopies: Math.max(0, Math.min(copies, editingBook.availableCopies + (copies - editingBook.totalCopies)))
      });
      setEditingBook(null);
    } else {
      onAddBook({
        bookId: `BK-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`,
        bookName: formName,
        author: formAuthor,
        publisher: formPublisher,
        category: formCategory,
        description: formDescription || "Syllabus resource item.",
        totalCopies: copies,
        availableCopies: copies
      });
    }

    setFormName('');
    setFormAuthor('');
    setFormPublisher('');
    setFormCategory('Academic');
    setFormDescription('');
    setFormCopies(5);
    setShowBookForm(false);
  };

  const openBookEdit = (book: Book) => {
    setEditingBook(book);
    setFormName(book.bookName);
    setFormAuthor(book.author);
    setFormPublisher(book.publisher);
    setFormCategory(book.category);
    setFormDescription(book.description);
    setFormCopies(book.totalCopies);
    setShowBookForm(true);
  };

  const handleExcelBooksImported = (imported: Book[]) => {
    onImportBooksExcel(imported);
    alert(currentLang === 'EN' ? `Bulk imported ${imported.length} books successfully!` : `${imported.length} पुस्तकें थोक में आयात की गईं!`);
  };

  const handleExcelStudentsImported = (imported: Student[]) => {
    onImportStudentsExcel(imported);
    alert(currentLang === 'EN' ? `Bulk imported ${imported.length} students successfully!` : `${imported.length} छात्र डेटा सफलतापूर्वक थोक में आयात किया गया!`);
  };

  const handlePrintAction = () => {
    window.print();
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      alert("Category already exists!");
      return;
    }
    setCategories(prev => [...prev, clean]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    // Prevent deleting categories in active use
    const isUsed = books.some(b => b.category.toLowerCase() === catToDelete.toLowerCase());
    if (isUsed) {
      alert(`Cannot delete '${catToDelete}': This category is currently associated with registered books in the catalog.`);
      return;
    }
    setCategories(prev => prev.filter(c => c !== catToDelete));
  };

  // Details state inside the interactive modal filter
  const filteredIssuedModalLogs = useMemo(() => {
    if (issuedModalFilter === 'Issued') {
      return issueLogs.filter(log => log.status === 'Issued');
    } else if (issuedModalFilter === 'Returned') {
      return issueLogs.filter(log => log.status === 'Returned');
    } else {
      return issueLogs.filter(log => log.status === 'Issued' && isOverdue(log.dueDate));
    }
  }, [issueLogs, issuedModalFilter]);

  return (
    <div className="space-y-6 animate-fade-in" id="librarian-workspace">
      
      {/* 0. REAL-TIME DATABASE ENGINE DIAGNOSTIC MONITOR */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs" id="mongodb-connection-monitor">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {dbStatus?.connected ? (
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-extrabold text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Database Engine Status:
              </span>
              {dbStatus?.connected ? (
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                  MongoDB Connected
                </span>
              ) : (
                <span className="bg-rose-50 dark:bg-rose-950/45 text-rose-800 dark:text-rose-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-200/50">
                  MongoDB Disconnected
                </span>
              )}
              {dbStatus?.mode === "production" && (
                <span className="bg-slate-900 text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase">
                  Production Mode
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-800 dark:text-slate-300">
              {dbStatus?.connected ? (
                <span>The portal is connected to live **MongoDB Atlas Cloud** cluster. All literature assets, student records, borrow requests, and circulation history files are persistently saved inside cloud database tables.</span>
              ) : (
                <span>
                  The portal is currently falling back to high-reliability **Local JSON Fallback Files**. 
                  {dbStatus?.mode === "production" ? (
                    <strong className="text-rose-600 dark:text-rose-400 ml-1">Strict Prohibition Alert: Local fallback files are prohibited in production! MongoDB is mandatory.</strong>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 ml-1">(Operational fallback active for developer environments).</span>
                  )}
                </span>
              )}
            </p>

            {dbStatus && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <span>Environment: <b className="text-slate-600 dark:text-slate-300">{dbStatus.mode}</b></span>
                <span>URI Configured: <b className={dbStatus.uriPresent ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{dbStatus.uriPresent ? "Yes" : "No"}</b></span>
                {dbStatus.uriPresent && (
                  <span>Masked Link: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300 text-[9px]">{dbStatus.maskedUri}</code></span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchDbStatus}
            disabled={dbLoading}
            className={`px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${dbLoading ? "animate-pulse opacity-60" : ""}`}
            title="Reload backend database link check"
          >
            <Sliders className={`w-3.5 h-3.5 ${dbLoading ? "animate-spin" : ""}`} />
            <span>{dbLoading ? "Retesting..." : "Re-Test Connection"}</span>
          </button>
        </div>
      </div>

      {/* 1. SECURE OVERDUE ACTION ALERT PANEL (PROMINENT DASHBOARD ALERTS) */}
      {overdueLogs.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 p-5 rounded-r-xl space-y-3.5 shadow-xs" id="librarian-overdue-banner">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-extrabold text-sm uppercase select-none">
            <AlertTriangle className="w-5 h-5 animate-bounce-short" />
            <span>⚠️ CRITICAL DIRECTIVE: OUTSTANDING OVERDUE ALERT MANAGER ({overdueLogs.length})</span>
          </div>
          
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-red-100/60 dark:bg-red-950/40 text-red-900 border-b border-red-200">
                  <th className="p-2.5 font-extrabold">Student Name</th>
                  <th className="p-2.5 font-mono text-center">Roll #</th>
                  <th className="p-2.5 font-bold text-center">Class / Section</th>
                  <th className="p-2.5 font-extrabold">Checked Book Title</th>
                  <th className="p-2.5 font-mono text-center">Due Return Date</th>
                  <th className="p-2.5 text-right font-black uppercase tracking-wider text-[9px]">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 font-mono text-slate-800">
                {overdueLogs.slice(0, 10).map(loan => {
                  const demo = getStudentProfile(loan.rollNumber);
                  return (
                    <tr key={loan.id} className="hover:bg-red-100/30">
                      <td className="p-2.5 font-sans font-extrabold">{loan.studentName}</td>
                      <td className="p-2.5 text-center font-bold">#{loan.rollNumber}</td>
                      <td className="p-2.5 text-center font-sans font-bold">Class {demo.class} - {demo.section}</td>
                      <td className="p-2.5 font-sans italic font-medium">{loan.bookName}</td>
                      <td className="p-2.5 text-center text-red-700 font-extrabold">{loan.dueDate}</td>
                      <td className="p-2.5 text-right text-red-800 font-sans font-black">
                        <span className="bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded text-[10px]">
                          {getDaysOverdue(loan.dueDate)} Days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {overdueLogs.length > 10 && (
              <p className="text-[10px] text-red-600 text-right pt-2 italic select-none">
                ...and {overdueLogs.length - 10} additional outstanding book loans. Click "Issued Books" below for expanded logs of all borrows.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4 core metrics row fully interactive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="librarian-metrics-bar">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            {t.metricsTotal}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white block mt-1">
            {totalBookCopies}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Titles count: {books.length}</span>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            {t.metricsAvail}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-850 dark:text-amber-400 block mt-1">
            {totalAvailableCopies}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Ready for issuance</span>
        </div>

        {/* INTERACTIVE AND CLICKABLE ISSUED BOOKS METRIC CARD */}
        <div 
          onClick={() => setShowIssuedModal(true)}
          className="bg-[#fbfcff] dark:bg-slate-900 border-2 border-slate-700/20 hover:border-slate-900 p-4.5 rounded-xl shadow-md transition-all cursor-pointer select-none group relative"
          id="kpi-issued-books-clickable"
          title="Click to view detailed Issued Books index"
        >
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block flex items-center justify-between">
            <span>{t.metricsIssued} 👆</span>
            <span className="text-[9px] bg-slate-900 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">Details</span>
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-700 block mt-1">
            {totalIssuedCopies}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1 underline decoration-dashed">
            Click to manage loan listings ({overdueLogs.length} overdue)
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            {t.metricsPend}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-red-600 block mt-1">
            {pendingRequestsCount}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Awaiting desk action</span>
        </div>
      </div>

      {/* Main Tab Controls Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => { setActiveTab('books'); setShowBookForm(false); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'books'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>{t.tabBooks}</span>
        </button>

        <button
          onClick={() => { setActiveTab('students'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>{t.tabStudents}</span>
        </button>

        <button
          onClick={() => { setActiveTab('requests'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 relative ${
            activeTab === 'requests'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <span>{t.tabRequests}</span>
          {pendingRequestsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('reports'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>{t.tabReports}</span>
        </button>

        <button
          onClick={() => { setActiveTab('security'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-11 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" />
          <span>Security Controls</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* BOOKS TAB PANEL */}
      {activeTab === 'books' && (
        <div className="space-y-6" id="tab-books-content">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder={t.bookSearchPlaceholder}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-205 rounded-lg outline-none focus:ring-1 focus:focus:ring-slate-800 animate-fade-in"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Categories Manager</span>
              </button>

              <button
                onClick={() => {
                  setEditingBook(null);
                  setFormName('');
                  setFormAuthor('');
                  setFormPublisher('');
                  setFormCategory(categories[0] || 'Academic');
                  setFormDescription('');
                  setFormCopies(5);
                  setShowBookForm(true);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.addBookBtn}</span>
              </button>
            </div>
          </div>

          {/* Book Catalog list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBooks.map(book => (
              <div 
                key={book.bookId}
                className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-xl shadow-xs flex gap-4"
              >
                <div className="w-20 shrink-0 select-none">
                  <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase">
                        {book.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {book.bookId}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mt-1">
                      {book.bookName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">by {book.author}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-mono">Press: {book.publisher}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                    <span className="text-[11px] text-slate-400">
                      Copies: <b className="text-slate-800 font-mono">{book.availableCopies} available</b> / {book.totalCopies} total
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openBookEdit(book)}
                        className="p-1 rounded hover:bg-slate-50 text-slate-650 cursor-pointer"
                        title="Edit specifications"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if(confirm(`Are you sure you want to delete '${book.bookName}'?`)) {
                            onDeleteBook(book.bookId);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                        title="Delete Book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Excel Importer segment specifically for books */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">
              {t.excelModuleTitle}
            </h3>
            <ExcelModule
              onImportBooks={handleExcelBooksImported}
              onImportStudents={handleExcelStudentsImported}
              currentLang={currentLang}
            />
          </div>

        </div>
      )}

      {/* STUDENTS TAB PANEL */}
      {activeTab === 'students' && (
        <div className="space-y-6" id="tab-students-content">
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t.studentSearchPlaceholder}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-205 rounded-lg outline-none focus:ring-1 focus:focus:ring-slate-800 animate-fade-in"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500 text-[10px]">
                  <th className="p-3">#</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3 text-center">government roll call number</th>
                  <th className="p-3">assigned class</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Date of Birth (DOB)</th>
                  <th className="p-3 text-right">Active Loans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredStudents.map((stud, idx) => {
                  const checkoutsCount = issueLogs.filter(log => log.rollNumber === stud.rollNumber && log.status === 'Issued').length;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400 font-mono">0{idx+1}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedProfileStudent(stud)}
                          className="hover:underline text-indigo-700 hover:text-indigo-905 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-left cursor-pointer focus:outline-none focus:ring-0 select-none"
                          title="Click to view full academic library profile history"
                        >
                          {stud.name}
                        </button>
                      </td>
                      <td className="p-3 text-center font-bold font-mono text-indigo-750">#{stud.rollNumber}</td>
                      <td className="p-3 font-bold font-sans">Grade {stud.class || "10"}</td>
                      <td className="p-3 font-mono">Section {stud.section || "A"}</td>
                      <td className="p-3 font-mono">{stud.dob}</td>
                      <td className="p-3 text-right font-extrabold text-amber-700 font-mono">
                        {checkoutsCount}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">No students registered in active ledger. Use spreadsheet bulk importer box below to enroll.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Excel Importer segment specifically for student data */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">
              {t.excelModuleTitle}
            </h3>
            <ExcelModule
              onImportBooks={handleExcelBooksImported}
              onImportStudents={handleExcelStudentsImported}
              currentLang={currentLang}
            />
          </div>

        </div>
      )}

      {/* REQUESTS & RETURNS TAB PANEL */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tab-requests-content">
          
          <div className="lg:col-span-8 space-y-6">
            
            {/* Pending Approvals Pool */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1.5 select-none">
                📜 Student Borrow Requests Awaiting Approval
              </h3>

              <div className="divide-y divide-slate-150">
                {requests.filter(r => r.status === 'Pending').map(req => (
                  <div key={req.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{req.studentName} (Roll #{req.rollNumber})</span>
                        <span className="text-[10px] bg-slate-100 text-slate-800 px-1.5 rounded font-mono border">RQ ID: {req.id}</span>
                      </div>
                      <p className="text-slate-650">Requested: <b>{req.bookName}</b></p>
                      <span className="text-[10px] text-slate-400 font-mono block">Date: {req.requestDate}</span>
                    </div>

                    <div className="flex gap-2 self-start sm:self-center shrink-0">
                      <button
                        onClick={() => onApproveRequest(req.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 select-none"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.id)}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 select-none"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}

                {requests.filter(r => r.status === 'Pending').length === 0 && (
                  <p className="py-6 text-center text-slate-400 text-xs">{t.noPenRequests}</p>
                )}
              </div>
            </div>

            {/* Active Loans & Return checks list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1.5 select-none">
                📚 {t.activeLoansHeadline}
              </h3>

              <div className="divide-y divide-slate-150">
                {activeLoans.slice(0, 15).map(loan => {
                  const outDemo = getStudentProfile(loan.rollNumber);
                  const isPastDue = isOverdue(loan.dueDate);
                  return (
                    <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{loan.studentName} (Roll #{loan.rollNumber})</span>
                          <span className="text-[10px] bg-slate-100 px-1 text-slate-600 font-bold font-sans">Class {outDemo.class}-{outDemo.section}</span>
                          <span className="text-[11px] text-slate-500 font-mono">[{loan.bookId}]</span>
                        </div>
                        <p className="text-slate-655 font-medium mt-1">Title: <b className="text-slate-800">{loan.bookName}</b></p>
                        <div className="flex gap-4 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono block">Issued date: {loan.issueDate}</span>
                          <span className={`text-[10px] font-mono font-bold block ${isPastDue ? 'text-red-500' : 'text-slate-400'}`}>
                            Due Date: {loan.dueDate} {isPastDue ? `(${getDaysOverdue(loan.dueDate)} Days Overdue!)` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onReturnBook(loan.id)}
                        className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10.5px] font-extrabold text-slate-700 rounded shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-center select-none"
                      >
                        <span>Check-In Book (Return)</span>
                      </button>
                    </div>
                  );
                })}

                {activeLoans.length > 15 && (
                  <p className="text-[10px] text-slate-400 text-center py-2 italic select-none">
                    Showing first 15 active loans. Click coordinates above in "Issued Books" KPI to view entire roster with filters.
                  </p>
                )}

                {activeLoans.length === 0 && (
                  <p className="py-6 text-center text-slate-400 text-xs">0 active loans outstanding.</p>
                )}
              </div>
            </div>

          </div>

          {/* Quick Direct Desk Issue Form (4 cols) */}
          <div className="lg:col-span-4" id="direct-issue-form">
            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shadow-sm border border-slate-850">
              <div className="space-y-1 select-none">
                <span className="text-amber-400 uppercase text-[9px] block font-bold font-mono tracking-widest">Walk-in Circulation Desk</span>
                <h4 className="font-extrabold text-xs uppercase tracking-wider">{t.manualIssueTitle}</h4>
              </div>

              <form onSubmit={handleManualIssueSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block select-none">{t.manualIssueRoll}</label>
                  <input
                    type="number"
                    required
                    value={walkinRoll}
                    onChange={(e) => setWalkinRoll(e.target.value)}
                    placeholder="Student Roll # (e.g. 12)"
                    className="w-full text-xs p-2.5 rounded bg-slate-950 border border-slate-800 text-white leading-tight outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block select-none">{t.manualIssueBook}</label>
                  
                  {/* Instantly Searchable input text */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search books by name, author, category..."
                      value={walkinBookSearchQuery}
                      onChange={(e) => {
                        setWalkinBookSearchQuery(e.target.value);
                      }}
                      className="w-full text-xs p-2.5 pr-8 rounded bg-slate-950 border border-slate-800 text-white leading-tight outline-none focus:ring-1 focus:ring-slate-800"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-2.5 top-3" />
                  </div>

                  {/* Search results list display */}
                  {walkinBookSearchQuery.trim().length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded max-h-40 overflow-y-auto divide-y divide-slate-900 text-xs">
                      {filteredWalkinBooks.length === 0 ? (
                        <div className="p-2.5 text-slate-500 italic">No matching books found</div>
                      ) : (
                        filteredWalkinBooks.map(b => (
                          <button
                            type="button"
                            key={b.bookId}
                            onClick={() => {
                              setWalkinBookId(b.bookId);
                              setWalkinBookSearchQuery(`${b.bookName} (${b.author})`);
                            }}
                            className={`w-full text-left p-2 hover:bg-slate-850 flex justify-between items-center transition-all ${
                              walkinBookId === b.bookId ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold">{b.bookName}</span>
                              <span className="text-[10px] text-slate-400 block truncate">by {b.author} • {b.category}</span>
                            </div>
                            <span className="text-[10px] bg-slate-900 text-emerald-400 border border-emerald-950 px-1.5 py-0.5 rounded font-mono shrink-0 font-bold">
                              {b.availableCopies} left
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Standard placeholder list / selector if the search is empty */}
                  {walkinBookSearchQuery.trim().length === 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded max-h-40 overflow-y-auto divide-y divide-slate-900 text-xs">
                      <div className="p-2 text-[10px] uppercase font-bold text-slate-500 select-none">Enter filter query or choose from list:</div>
                      {books.filter(b => b.availableCopies > 0).slice(0, 10).map(b => (
                        <button
                          type="button"
                          key={b.bookId}
                          onClick={() => {
                            setWalkinBookId(b.bookId);
                            setWalkinBookSearchQuery(`${b.bookName} (${b.author})`);
                          }}
                          className={`w-full text-left p-2 hover:bg-slate-850 flex justify-between items-center transition-all ${
                            walkinBookId === b.bookId ? 'bg-slate-800 text-amber-500 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold">{b.bookName}</span>
                            <span className="text-[10px] text-slate-500 block truncate">by {b.author} • {b.category}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {b.availableCopies} copies
                          </span>
                        </button>
                      ))}
                      {books.filter(b => b.availableCopies > 0).length > 10 && (
                        <div className="p-2 text-[10px] text-center text-slate-500 select-none font-mono">
                          +{books.filter(b => b.availableCopies > 0).length - 10} more books... Type in search.
                        </div>
                      )}
                    </div>
                  )}

                  {walkinBookId && (
                    <div className="px-3 py-1.5 bg-[#022c22] border border-emerald-950 text-emerald-400 rounded text-[11px] font-bold flex items-center justify-between">
                      <span className="truncate">Selected Book ID: <span className="font-mono text-white text-xs">{walkinBookId}</span></span>
                      <button 
                        type="button" 
                        onClick={() => { setWalkinBookId(''); setWalkinBookSearchQuery(''); }}
                        className="text-red-400 hover:text-red-300 font-black cursor-pointer px-1.5"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full p-3 bg-slate-850 hover:bg-slate-800 text-white font-extrabold text-xs rounded transition-all tracking-wider cursor-pointer flex items-center justify-center gap-1.5 select-none"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{t.issueSubmit}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* PRINTABLE REPORTS TAB PANEL */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in" id="librarian-reports-view">
          
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1 flex-wrap gap-1">
            <button
               onClick={() => setActiveReport('inventory')}
               className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                  activeReport === 'inventory'
                    ? 'border-slate-800 bg-slate-100 text-slate-900 dark:text-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-805'
               }`}
            >
              📋 Catalog Inventory Report
            </button>
            <button
               onClick={() => setActiveReport('loans')}
               className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                  activeReport === 'loans'
                    ? 'border-slate-800 bg-slate-100 text-slate-900 dark:text-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-805'
               }`}
            >
              📖 Issued Books Report
            </button>
            <button
               onClick={() => setActiveReport('students')}
               className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                  activeReport === 'students'
                    ? 'border-slate-800 bg-slate-100 text-slate-900 dark:text-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-805'
               }`}
            >
              👥 Student Roster Register
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between">
            <div className="text-xs text-slate-500 select-none">
              Select any report tab above. Press <b>Print Report</b> below to generate an official hardcopy PDF directly from your browser.
            </div>
            
            <button
              onClick={handlePrintAction}
              className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer select-none"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report Sheet (PDF)</span>
            </button>
          </div>

          {/* Report Paper Sheet Visual */}
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-8 max-w-4xl mx-auto shadow-sm" id="printable-paper-sheet">
            
            {/* Paper Title Banner */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-5 select-none">
              <span className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded font-extrabold tracking-widest uppercase">
                Official school administration archive report
              </span>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                RAMDIRI +2 HIGH SCHOOL LIBRARY REGISTER
              </h2>
              <p className="text-xs text-slate-500 font-medium font-sans">
                Begusarai District Educational Area, Bihar, IN | BSEB Code: BEG-52031
              </p>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-2 pt-2">
                <span>Date generated: {new Date().toISOString().split('T')[0]}</span>
                <span>System Health: Certified Safe</span>
              </div>
            </div>

            {/* Tab content 1: Inventory */}
            {activeReport === 'inventory' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                  <span>Unique Titles: {books.length}</span>
                  <span>Total Copies Volume: {books.reduce((sum, b) => sum + b.totalCopies, 0)}</span>
                  <span>Available on Shelf: {books.reduce((sum, b) => sum + b.availableCopies, 0)}</span>
                </div>
                
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-405 font-bold text-slate-900">
                      <th className="py-2.5 pr-2">Book ID</th>
                      <th className="py-2.5">Book Title</th>
                      <th className="py-2.5">Author</th>
                      <th className="py-2.5">Publisher</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5 text-right font-bold">Total Copies</th>
                      <th className="py-2.5 text-right font-bold">In-Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-155">
                    {books.map(b => (
                      <tr key={b.bookId}>
                        <td className="py-2 font-mono text-slate-500">{b.bookId}</td>
                        <td className="py-2 font-bold text-slate-950">{b.bookName}</td>
                        <td className="py-2 text-slate-600">{b.author}</td>
                        <td className="py-2 text-slate-600">{b.publisher}</td>
                        <td className="py-2">{b.category}</td>
                        <td className="py-2 text-right font-mono">{b.totalCopies}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-800">{b.availableCopies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab content 2: Loans */}
            {activeReport === 'loans' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                  <span>Active Loans: {activeLoans.length}</span>
                  <span>Total Past Returned: {issueLogs.filter(log => log.status === 'Returned').length}</span>
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-405 font-bold text-slate-900">
                      <th className="py-2.5">Borrower Student</th>
                      <th className="py-2.5">Government Roll #</th>
                      <th className="py-2.5">Book Title</th>
                      <th className="py-2.5 text-center">Checkout Date</th>
                      <th className="py-2.5 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {activeLoans.map(log => (
                      <tr key={log.id}>
                        <td className="py-2 font-bold text-slate-950">{log.studentName}</td>
                        <td className="py-2 font-mono">#{log.rollNumber}</td>
                        <td className="py-2 text-slate-700">{log.bookName}</td>
                        <td className="py-2 text-center font-mono">{log.issueDate}</td>
                        <td className="py-2 text-right font-bold text-amber-700 uppercase">{log.status}</td>
                      </tr>
                    ))}
                    {activeLoans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">0 active library loans recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab content 3: Students */}
            {activeReport === 'students' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                  <span>Registered Students: {students.length}</span>
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-405 font-bold text-slate-900">
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5 text-center">Class / Section</th>
                      <th className="py-2.5">Roll Number</th>
                      <th className="py-2.5">Date of Birth (DOB)</th>
                      <th className="py-2.5 text-right font-bold">Active Checkouts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {students.map((stud, idx) => {
                      const userActiveLoans = activeLoans.filter(l => l.rollNumber === stud.rollNumber).length;
                      return (
                        <tr key={idx}>
                          <td className="py-2 font-bold text-slate-950">{stud.name}</td>
                          <td className="py-2 text-center">Class {stud.class || "10"} - {stud.section || "A"}</td>
                          <td className="py-2 font-mono">#{stud.rollNumber}</td>
                          <td className="py-2 font-mono">{stud.dob}</td>
                          <td className="py-2 text-right font-mono font-bold text-amber-800">{userActiveLoans}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paper signature section */}
            <div className="border-t border-dashed border-slate-400 pt-10 mt-12 flex justify-between text-xs text-slate-600">
              <div className="space-y-2">
                <div className="h-6 w-36 border-b border-slate-400"></div>
                <p>Signature, Chief Librarian</p>
              </div>
              <div className="space-y-2 text-right flex flex-col items-end">
                <div className="h-6 w-36 border-b border-slate-400 ml-auto"></div>
                <p>Seal, Ramdiri School Administration</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MANUALLY REGISTER BOOK FORM MODAL */}
      {showBookForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {editingBook ? t.editBookTitle : t.addBookTitle}
              </span>
              <button 
                onClick={() => { setShowBookForm(false); setEditingBook(null); }}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookFormSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formBookName}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Vigyan Class 10 Handbooks"
                  className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formAuthor}</label>
                <input
                  type="text"
                  required
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  placeholder="e.g. NCERT Panel Board"
                  className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formPublisher}</label>
                <input
                  type="text"
                  required
                  value={formPublisher}
                  onChange={(e) => setFormPublisher(e.target.value)}
                  placeholder="e.g. BSTBPC Patna press"
                  className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formCategory}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-955 border border-slate-255 block outline-none dark:border-slate-800"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formCopies}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formCopies}
                    onChange={(e) => setFormCopies(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-955 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">{t.formDescription}</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Syllabus chapter topics summaries or notes details..."
                  className="w-full text-xs p-2 rounded bg-white dark:bg-slate-955 border border-slate-250 h-20 resize-none outline-none focus:ring-1 focus:ring-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowBookForm(false); setEditingBook(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded cursor-pointer select-none"
                >
                  {t.saveBtn}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CHIEF LIBRARIAN CREDENTIAL ROTATION SECURITY SETTINGS PANEL */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6 shadow-xs animate-fade-in" id="security-tab-content">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
              Administrative Security Settings
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Rotate school library management credentials. These settings are updated securely using salted BCrypt hashing and instantly written to the backend database store.
            </p>
          </div>

          <form onSubmit={handleUpdateCredentials} className="max-w-md space-y-4">
            
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                New Administrative Username
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-955 rounded focus:ring-1 focus:ring-slate-800 outline-none"
              />
              <span className="text-[10px] text-slate-400 block font-sans select-none">Usernames are non-case sensitive. We recommend using lowercase characters.</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                Current Password Passphrase (Required)
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Verify your identity with current password"
                  className="w-full text-xs text-slate-900 dark:text-white p-2.5 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-955 rounded focus:ring-1 focus:ring-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                  New Secure Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full text-xs text-slate-900 dark:text-white p-2.5 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-955 rounded focus:ring-1 focus:ring-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-955 rounded focus:ring-1 focus:ring-slate-800 outline-none"
                />
              </div>
            </div>

            {secError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-xs flex items-start gap-1.5 animate-bounce-short">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{secError}</span>
              </div>
            )}

            {secSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{secSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={secLoading}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none"
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span>{secLoading ? "Updating Configurations..." : "Commit Credentials Update"}</span>
            </button>

          </form>

          {/* Secure guidelines about rotating access key hashes and storage */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-xs text-slate-500 space-y-2 select-none">
            <h4 className="font-bold text-slate-850 dark:text-slate-355 uppercase text-[10px] tracking-wider">
              🛡️ Administrative Access Management Protocol
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>Passwords must be robust, containing alphanumeric characters and symbols.</li>
              <li>Credentials are hashed locally, then written directly to the secure MongoDB backing or local JSON database file.</li>
              <li>Always secure and never disclose administrative credentials publicly.</li>
            </ul>
          </div>
        </div>
      )}

      {/* DYNAMIC CATEGORY MANAGER MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in" id="category-manager-modal">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider">Manage Curricular Catalog Categories</span>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter new Category Name..."
                  className="flex-1 text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded transition-all cursor-pointer select-none"
                >
                  Add
                </button>
              </form>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {categories.map(cat => {
                  const numBooksInCat = books.filter(b => b.category.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <div key={cat} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-950/40 rounded border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{cat}</span>
                        <span className="text-[10px] text-slate-400 block">{numBooksInCat} books allocated</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={numBooksInCat > 0}
                        className={`p-1.5 rounded cursor-pointer ${
                          numBooksInCat > 0 
                            ? 'text-slate-200 cursor-not-allowed' 
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                        title={numBooksInCat > 0 ? "Cannot delete category in use" : "Delete category"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-105 flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded cursor-pointer select-none"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC ISSUED BOOK DETAILS MODAL PANEL (CLICKABLE KPI VIEWER) */}
      {showIssuedModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in" id="issued-books-details-panel">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-indigo-950 text-white p-4.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs uppercase tracking-wider block text-indigo-300">Administrative Logs Console</span>
                <h3 className="text-sm font-black uppercase">Detailed Student Issue & Checkout Registers Dashboard</h3>
              </div>
              <button 
                onClick={() => setShowIssuedModal(false)}
                className="w-7 h-7 rounded-full hover:bg-indigo-900 flex items-center justify-center text-indigo-200 hover:text-white transition-all cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter segments inside dynamic issued list model */}
            <div className="flex bg-slate-50 border-b border-slate-150 p-2 gap-2">
              <button
                onClick={() => setIssuedModalFilter('Issued')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  issuedModalFilter === 'Issued'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📖 Currently Issued ({activeLoans.length})
              </button>
              <button
                onClick={() => setIssuedModalFilter('Returned')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  issuedModalFilter === 'Returned'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✅ Returned Books ({issueLogs.filter(log => log.status === 'Returned').length})
              </button>
              <button
                onClick={() => setIssuedModalFilter('Overdue')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  issuedModalFilter === 'Overdue'
                    ? 'bg-red-655 text-white shadow-xs'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Overdue Books ({overdueLogs.length})</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5 text-center font-mono">Roll Number</th>
                    <th className="p-2.5 text-center">Class / Section</th>
                    <th className="p-2.5">Book Title</th>
                    <th className="p-2.5 font-mono text-center">Checkout Date</th>
                    <th className="p-2.5 font-mono text-center">Due Return Date</th>
                    <th className="p-2.5 text-right font-bold">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                  {filteredIssuedModalLogs.map(log => {
                    const demo = getStudentProfile(log.rollNumber);
                    const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-sans font-bold">{log.studentName}</td>
                        <td className="p-2.5 text-center">#{log.rollNumber}</td>
                        <td className="p-2.5 text-center font-sans">Class {demo.class} - {demo.section}</td>
                        <td className="p-2.5 font-sans font-medium italic">{log.bookName}</td>
                        <td className="p-2.5 text-center">{log.issueDate}</td>
                        <td className={`p-2.5 text-center font-bold ${isPastDue ? 'text-red-600 font-black' : ''}`}>{log.dueDate}</td>
                        <td className="p-2.5 text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-sans font-extrabold uppercase inline-block border ${
                            log.status === 'Returned'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                              : isPastDue
                              ? 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {log.status === 'Returned' ? 'Returned' : isPastDue ? `${getDaysOverdue(log.dueDate)} Days Overdue` : 'Issued'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredIssuedModalLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-sans text-xs">
                        No checked records available inside this selected register.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-105 flex justify-end">
              <button
                onClick={() => setShowIssuedModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded shadow-xs cursor-pointer select-none"
              >
                Done / Close Console
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. STUDENT PROFILE DETAIL VIEW MODAL (CLICKABLE STUDENT PROFILE INSIDE LIST) */}
      {selectedProfileStudent && (() => {
        const stud = selectedProfileStudent;
        const studentRequests = requests.filter(r => r.rollNumber === stud.rollNumber);
        const studentLogs = issueLogs.filter(l => l.rollNumber === stud.rollNumber);
        const totalRequested = studentRequests.length;
        const totalIssuedValue = studentLogs.length;
        const totalReturnedValue = studentLogs.filter(l => l.status === 'Returned' || l.returnDate).length;
        const currentlyIssuedValue = studentLogs.filter(l => l.status === 'Issued').length;
        const overdueBooksValue = studentLogs.filter(l => l.status === 'Issued' && isOverdue(l.dueDate)).length;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in" id="student-profile-details-modal">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col text-slate-900 dark:text-slate-100">
              
              {/* Modal Header */}
              <div className="bg-emerald-955 text-white p-5 flex items-center justify-between" style={{ backgroundColor: '#022c22' }}>
                <div className="space-y-0.5 animate-fade-in">
                  <span className="font-bold text-[10px] uppercase tracking-widest block text-emerald-400 font-mono">★★ PM SHRI RAMDIRI +2 HIGH SCHOOL ★★</span>
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{currentLang === 'HI' ? "छात्र शैक्षणिक पुस्तकालय इतिहास" : "Student Academic & Library History"}</span>
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedProfileStudent(null)}
                  className="w-8 h-8 rounded-full hover:bg-emerald-990 flex items-center justify-center text-emerald-200 hover:text-white transition-all cursor-pointer font-bold select-none"
                  title="Close Modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Container */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                {/* 1. Student Info Grid & Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Left demographics block (5 cols) */}
                  <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4.5 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">🏫 Demographic Particulars</span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "पूरा नाम" : "Full Name"}:</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-right">{stud.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "रॉल नंबर" : "Roll Call Number"}:</span>
                        <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400 text-right">#{stud.rollNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "कक्षा" : "Assigned Class"}:</span>
                        <span className="font-bold font-sans text-right">Grade {stud.class || "10"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "वर्ग / सेक्शन" : "Section Block"}:</span>
                        <span className="font-bold font-sans text-right">Section {stud.section || "A"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "जन्म तिथि" : "Date of Birth"}:</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-350 text-right">{stud.dob}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Highlights statistics (7 cols) */}
                  <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: currentLang === 'HI' ? "कुल अनुरोध" : "Total Requested",
                        val: totalRequested,
                        bgColor: "bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-950",
                        textColor: "text-blue-750 dark:text-blue-400"
                      },
                      {
                        label: currentLang === 'HI' ? "कुल जारी" : "Issued Ledger",
                        val: totalIssuedValue,
                        bgColor: "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-950",
                        textColor: "text-indigo-750 dark:text-indigo-400"
                      },
                      {
                        label: currentLang === 'HI' ? "कुल लौटाया" : "Total Returned",
                        val: totalReturnedValue,
                        bgColor: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-950",
                        textColor: "text-emerald-750 dark:text-emerald-400"
                      },
                      {
                        label: currentLang === 'HI' ? "वर्तमान सक्रिय" : "Active Loans",
                        val: currentlyIssuedValue,
                        bgColor: "bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-950",
                        textColor: "text-amber-700 dark:text-amber-400"
                      },
                      {
                        label: currentLang === 'HI' ? "अतिदेय (Overdue)" : "Overdue Books",
                        val: overdueBooksValue,
                        bgColor: overdueBooksValue > 0 ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" : "bg-slate-50 border-slate-200 dark:bg-slate-950/10 dark:border-slate-850",
                        textColor: overdueBooksValue > 0 ? "text-red-700 font-extrabold animate-pulse" : "text-slate-500"
                      }
                    ].map((card, i) => (
                      <div 
                        key={i} 
                        className={`p-3 border rounded-xl flex flex-col justify-between ${card.bgColor}`}
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight select-none">{card.label}</span>
                        <span className={`text-xl font-bold font-mono mt-1 ${card.textColor}`}>{card.val}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* 2. Transaction Logs History List */}
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">📜 Checkouts History & Logs Pool</span>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 uppercase text-slate-500 font-bold text-[9px] border-b border-slate-150 dark:border-slate-800">
                          <th className="p-3">Book Name</th>
                          <th className="p-3">Author</th>
                          <th className="p-3 text-center font-mono">Issue Date</th>
                          <th className="p-3 text-center font-mono">Due Date</th>
                          <th className="p-3 text-center font-mono">Return Date</th>
                          <th className="p-3 text-right">Status State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {studentLogs.map((log, lidx) => {
                          const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
                          let logStatus = "Currently Issued";
                          if (log.status === 'Returned') {
                            logStatus = "Returned";
                          } else if (isPastDue) {
                            logStatus = "Overdue";
                          }

                          const matchedB = books.find(b => b.bookId === log.bookId);
                          const bookAuthorStr = matchedB ? matchedB.author : "Bihar Education Board";

                          return (
                            <tr key={lidx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20 font-mono text-slate-850 dark:text-slate-200">
                              <td className="p-3 font-sans font-bold">{log.bookName}</td>
                              <td className="p-3 font-sans text-slate-500 dark:text-slate-400 text-xs">{bookAuthorStr}</td>
                              <td className="p-3 text-center">{log.issueDate}</td>
                              <td className="p-3 text-center font-bold">{log.dueDate}</td>
                              <td className="p-3 text-center text-emerald-700 dark:text-emerald-400 font-extrabold">{log.returnDate || "-"}</td>
                              <td className="p-3 text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-sans font-extrabold uppercase inline-block border ${
                                  logStatus === 'Returned'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-950 dark:text-emerald-300'
                                    : logStatus === 'Overdue'
                                    ? 'bg-red-50 text-red-800 border-red-200 text-red-750 font-black animate-pulse dark:bg-red-950/20 dark:border-red-900 dark:text-red-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:border-amber-950 dark:text-amber-300'
                                }`}>
                                  {logStatus === 'Returned' 
                                    ? (currentLang === 'HI' ? "जमा" : "Returned") 
                                    : logStatus === 'Overdue' 
                                    ? (currentLang === 'HI' ? "विलंबित" : "Overdue") 
                                    : (currentLang === 'HI' ? "जारी" : "Currently Issued")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {studentLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">No physical book issues in student's academic history ledger.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProfileStudent(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-855 text-white font-extrabold text-xs rounded shadow transition-all cursor-pointer select-none"
                >
                  Close History Register
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
