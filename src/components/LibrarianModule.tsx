/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Book, Student, BorrowRequest, BookIssueLog, LibraryAuditLog, StudyMaterial } from '../types';
import ExcelModule from './ExcelModule';
import { GoogleBookCover } from './PublicHome';
import { searchBooksSmart } from '../lib/searchUtils';
import { 
  PlusCircle, Edit, Trash2, CheckCircle, XCircle, FileText, FolderPlus,
  BookOpen, Users, ClipboardCheck, Printer, Search, Download, AlertTriangle, ArrowUpRight,
  Key, Eye, EyeOff, Shield, Sliders, AlertCircle, User, Database, RefreshCw, Upload, Clock,
  Grid, LayoutGrid, ArrowUpDown
} from 'lucide-react';

interface LibrarianModuleProps {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  auditLogs: LibraryAuditLog[];
  studyMaterials?: StudyMaterial[];
  onRefreshInputLogs?: () => void;
  currentLang: 'EN' | 'HI';
  onAddBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onDeleteBooksBulk: (ids: string[]) => void;
  onClearInventory: () => void;
  onApproveRequest: (id: string, dueDate?: string) => void;
  onRejectRequest: (id: string) => void;
  onHoldRequest?: (id: string) => void;
  onCancelRequest?: (id: string) => void;
  onReturnBook: (logId: string) => void;
  onAddStudyMaterial?: (material: Omit<StudyMaterial, 'id' | 'createdAt'>) => Promise<boolean>;
  onDeleteStudyMaterial?: (id: string) => Promise<boolean>;
  onAddRequest: (req: BorrowRequest) => void;
  onImportBooksExcel: (books: Book[]) => void;
  onImportStudentsExcel: (students: Student[]) => void;
  onAddStudent: (student: Student) => Promise<boolean>;
  onEditStudent: (student: Student) => Promise<boolean>;
  onDeleteStudent: (studentId: string) => Promise<boolean>;
  onDeleteStudentsBulk?: (ids: string[]) => Promise<boolean>;
  onClearStudentsRegistry?: () => Promise<boolean>;
  onBackupDatabase?: () => Promise<void>;
  onRestoreDatabase?: (payload: any) => Promise<boolean>;
  onResetDatabase?: () => void;
  loggedInName?: string;
  onUpdateLoggedInName?: (newName: string) => void;
  onBulkIssue?: (payload: {
    rollNumber: string;
    class: string;
    section: string;
    studentName: string;
    bookIds: string[];
    dueDate: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function LibrarianModule({
  books: rawBooks,
  students: rawStudents,
  requests: rawRequests,
  issueLogs: rawIssueLogs,
  auditLogs: rawAuditLogs,
  studyMaterials: rawStudyMaterials = [],
  onRefreshInputLogs,
  currentLang,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onDeleteBooksBulk,
  onClearInventory,
  onApproveRequest,
  onRejectRequest,
  onHoldRequest,
  onCancelRequest,
  onReturnBook,
  onAddRequest,
  onImportBooksExcel,
  onImportStudentsExcel,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onDeleteStudentsBulk,
  onClearStudentsRegistry,
  onBackupDatabase,
  onRestoreDatabase,
  onResetDatabase,
  loggedInName,
  onUpdateLoggedInName,
  onBulkIssue,
  onAddStudyMaterial,
  onDeleteStudyMaterial
}: LibrarianModuleProps) {
  const studyMaterials = Array.isArray(rawStudyMaterials) ? rawStudyMaterials : [];
  const books = Array.isArray(rawBooks) ? rawBooks : [];
  const students = Array.isArray(rawStudents) ? rawStudents : [];
  const requests = Array.isArray(rawRequests) ? rawRequests : [];
  const issueLogs = Array.isArray(rawIssueLogs) ? rawIssueLogs : [];
  const auditLogs = Array.isArray(rawAuditLogs) ? rawAuditLogs : [];
  // Tabs config
  const [activeTab, setActiveTab] = useState<'books' | 'students' | 'requests' | 'reports' | 'security' | 'database' | 'study-materials'>('books');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  
  // Debounced Search Inputs and original query state
  const [bookSearchInput, setBookSearchInput] = useState<string>('');
  const [studentSearchInput, setStudentSearchInput] = useState<string>('');
  const [bookSearch, setBookSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Sliced Pagination indices
  const [booksPage, setBooksPage] = useState<number>(1);
  const [studentsPage, setStudentsPage] = useState<number>(1);
  const [activeLoansPage, setActiveLoansPage] = useState<number>(1);

  // Performance Profiling Metrics
  const [bookSearchElapsed, setBookSearchElapsed] = useState<number>(0.15);
  const [studentSearchElapsed, setStudentSearchElapsed] = useState<number>(0.11);

  // --- CSV DATA MIGRATION HELPERS ---
  const exportToCSV = (data: any[], filename: string, headers: string[], keys: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        result.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      result.push(row);
    }
    return result;
  };

  // Profile changes success verification step tracker
  const [newName, setNewName] = useState<string>('');
  const [successReportName, setSuccessReportName] = useState<{ prev: string; curr: string } | null>(null);

  // Audit log filtering states
  const [auditQuery, setAuditQuery] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  const filteredAuditLogs = useMemo(() => {
    let list = auditLogs || [];
    if (auditActionFilter !== 'ALL') {
      list = list.filter(log => log.action === auditActionFilter);
    }
    if (auditQuery.trim() !== '') {
      const q = auditQuery.toLowerCase();
      list = list.filter(log => 
        log.details.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, auditQuery, auditActionFilter]);

  const handleExportAuditLogs = () => {
    const headers = ["Timestamp", "Authorized User", "Action Type", "Activity Details"];
    const rows = filteredAuditLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.action,
      log.details
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `library_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // Debouncing handlers
  useEffect(() => {
    const handler = setTimeout(() => {
      setBookSearch(bookSearchInput);
      setBooksPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [bookSearchInput]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setStudentSearch(studentSearchInput);
      setStudentsPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [studentSearchInput]);

  // Active Report sub-tab ('inventory' | 'loans' | 'students' | 'overdue' | 'history' | 'frequent')
  const [activeReport, setActiveReport] = useState<'inventory' | 'loans' | 'students' | 'overdue' | 'history' | 'frequent'>('inventory');

  // Excel Table View & Sorting & Dewey Decimal Classification states
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'table'>('table');
  const [catalogSortField, setCatalogSortField] = useState<string>('bookId');
  const [catalogSortOrder, setCatalogSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ddcRangeFilter, setDdcRangeFilter] = useState<string>('all');

  // Manual Book state
  const [showBookForm, setShowBookForm] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<BorrowRequest | null>(null);
  
  // Fields for manual book adding/editing
  const [formName, setFormName] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formCategory, setFormCategory] = useState('Academic');
  const [formDescription, setFormDescription] = useState('');
  const [formCopies, setFormCopies] = useState<number>(5);
  const [formAccessionNumber, setFormAccessionNumber] = useState('');
  const [formYearOfPublication, setFormYearOfPublication] = useState('');
  const [formPlaceOfPublication, setFormPlaceOfPublication] = useState('');
  const [formEditor, setFormEditor] = useState('');
  const [formEdition, setFormEdition] = useState('');
  const [formVolume, setFormVolume] = useState('');
  const [formPages, setFormPages] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCallNumber, setFormCallNumber] = useState('');
  const [formBookNumber, setFormBookNumber] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formDdcNumber, setFormDdcNumber] = useState('');

  // --- Study Materials State Hooks ---
  const [matTitle, setMatTitle] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matVisibleTo, setMatVisibleTo] = useState('All');
  const [matExpiryDate, setMatExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1); // 1 year expiry default
    return d.toISOString().split('T')[0];
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  // Manual issue walk-in desk check
  const [walkinClass, setWalkinClass] = useState<string>('10');
  const [walkinSection, setWalkinSection] = useState<string>('A');
  const [walkinRoll, setWalkinRoll] = useState<string>('');
  const [walkinBookIds, setWalkinBookIds] = useState<string[]>([]);
  const [walkinBookSearchQuery, setWalkinBookSearchQuery] = useState<string>('');
  const [walkinDueDate, setWalkinDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [approvalDates, setApprovalDates] = useState<Record<string, string>>({});
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);

  // Selected student for profile history modal view
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);

  // Selected book for profile history modal view
  const [selectedProfileBook, setSelectedProfileBook] = useState<Book | null>(null);

  // Manual Student administration form states
  const [showStudentForm, setShowStudentForm] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studName, setStudName] = useState('');
  const [studClass, setStudClass] = useState('10');
  const [studSection, setStudSection] = useState('A');
  const [studRoll, setStudRoll] = useState<string>('');
  const [studDOB, setStudDOB] = useState('2010-01-01');

  // Student list quick filtering selectors
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');

  // DDC category instant filter selector
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

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

  // Custom high-fidelity non-blocking interactive overlay states
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete-book' | 'delete-selected-books' | 'clear-books' | 'delete-student' | 'delete-selected-students' | 'clear-students' | 'restore-database' | 'reset-database';
    title: string;
    message: string;
    confirmLabel: string;
    requireInput?: string;
    targetId?: string | string[];
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState<string>('');

  const [alertOverlay, setAlertOverlay] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // High-fidelity local override shadow for `alert` calls within the module
  const alert = (msg: string) => {
    setAlertOverlay({
      title: "Notification Alert",
      message: msg,
      type: 'info'
    });
  };

  // Categories expansion state persistence
  const defaultCategories = useMemo(() => [
    "000 General Works",
    "100 Philosophy",
    "200 Religion",
    "300 Social Sciences",
    "400 Language",
    "500 Science",
    "600 Technology",
    "700 Arts",
    "800 Literature",
    "900 History & Geography",
    "Needs Librarian Review",
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

  // Prepopulate security config and benchmark elapsed search times
  useEffect(() => {
    if (activeTab === 'security') {
      setNewName(loggedInName || "S. K. Roy (Chief Librarian)");
      const tok = localStorage.getItem("ramdiri_library_token");
      if (tok) {
        try {
          const payload = JSON.parse(atob(tok.split('.')[1]));
          setNewUsername(payload.username || "ramdiri_admin_roy");
        } catch (e) {
          setNewUsername("ramdiri_admin_roy");
        }
      }
    }
  }, [activeTab, loggedInName]);

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

  const handleCustomConfirmExecute = async () => {
    if (!confirmModal) return;

    const { type, requireInput, targetId } = confirmModal;

    // Type checking and verification input
    if (requireInput && confirmInput.trim().toUpperCase() !== requireInput.trim().toUpperCase()) {
      setAlertOverlay({
        title: "Validation Defect",
        message: `Please enter '${requireInput}' exactly to authorize this destructive administrative operation.`,
        type: 'error'
      });
      return;
    }

    setConfirmModal(null);
    setConfirmInput('');

    try {
      if (type === 'delete-book' && typeof targetId === 'string') {
        onDeleteBook(targetId);
        setAlertOverlay({
          title: "Deletion Completed",
          message: "The selected academic book asset record has been completely expunged from database files and indexing metrics.",
          type: 'success'
        });
      } else if (type === 'delete-selected-books' && Array.isArray(targetId)) {
        onDeleteBooksBulk(targetId);
        setSelectedBookIds([]);
        setAlertOverlay({
          title: "Bulk Deletion Completed",
          message: `Successfully removed ${targetId.length} book records from library database registers.`,
          type: 'success'
        });
      } else if (type === 'clear-books') {
        onClearInventory();
        setSelectedBookIds([]);
        setAlertOverlay({
          title: "Entire Catalog Cleared",
          message: "All library book accounts, accession slots, and shelf allocation entries have been entirely erased.",
          type: 'success'
        });
      } else if (type === 'delete-student' && typeof targetId === 'string') {
        const success = await onDeleteStudent(targetId);
        if (success) {
          setAlertOverlay({
            title: "Student Deleted",
            message: "Student registration credentials and portfolio logs have been permanently deleted from school registers.",
            type: 'success'
          });
        }
      } else if (type === 'delete-selected-students' && Array.isArray(targetId)) {
        const success = await onDeleteStudentsBulk?.(targetId);
        if (success) {
          setSelectedStudentIds([]);
          setAlertOverlay({
            title: "Bulk Roster Removal Success",
            message: `Successfully deleted ${targetId.length} selected student registration accounts.`,
            type: 'success'
          });
        }
      } else if (type === 'clear-students') {
        const success = await onClearStudentsRegistry?.();
        if (success) {
          setSelectedStudentIds([]);
          setAlertOverlay({
            title: "Registry Purged Completely",
            message: "Every student account record, roll history, and passcode registration has been successfully cleared.",
            type: 'success'
          });
        }
      } else if (type === 'restore-database' && typeof targetId === 'string') {
        const payload = JSON.parse(targetId);
        const success = await onRestoreDatabase?.(payload);
        if (success) {
          setAlertOverlay({
            title: "Database Restoration Succeeded",
            message: "All systems index, student rosters, academic books, and checkout transactions have been successfully hot-restored.",
            type: 'success'
          });
          fetchDbInspectorStats();
        }
      } else if (type === 'reset-database') {
        onResetDatabase?.();
        setAlertOverlay({
          title: "Enterprise Reseed Completed",
          message: "The library portal database was successfully factory reset to PM SHRI Bihar State government standard baseline parameters.",
          type: 'success'
        });
        fetchDbInspectorStats();
      }
    } catch (err: any) {
      setAlertOverlay({
        title: "Action Defect Error",
        message: err.message || "An unexpected error occurred during database action invocation.",
        type: 'error'
      });
    }
  };

  const [dbInspectorStats, setDbInspectorStats] = useState<{
    mongoConnected: boolean;
    booksCount: number;
    studentsCount: number;
    requestsCount: number;
    issueLogsCount: number;
    lastImportDate: string;
    lastImportSize: number;
  } | null>(null);
  const [dbInspectorLoading, setDbInspectorLoading] = useState<boolean>(false);
  const [inspectorPreviewColl, setInspectorPreviewColl] = useState<'books' | 'students'>('books');

  const fetchDbInspectorStats = async () => {
    setDbInspectorLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/database/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setDbInspectorStats(data);
      }
    } catch (err) {
      console.error("Error fetching db inspector stats:", err);
    } finally {
      setDbInspectorLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 15000); // Poll status every 15s to ensure accuracy 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDbInspectorStats();
    }
  }, [activeTab]);

  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Issued Details Modal state
  const [showIssuedModal, setShowIssuedModal] = useState<boolean>(false);
  const [issuedModalFilter, setIssuedModalFilter] = useState<'Issued' | 'Returned' | 'Overdue'>('Issued');

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecSuccess(null);
    setSuccessReportName(null);

    if (!newUsername.trim()) {
      setSecError("Username is required.");
      return;
    }
    if (!newName.trim()) {
      setSecError("Librarian Display Name is required.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setSecError("New password must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecError("New password and confirmation password do not match.");
      return;
    }

    setSecLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");
    const previousName = loggedInName || "S. K. Roy (Chief Librarian)";

    fetch('/api/auth/change-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPassword,
        newName: newName.trim(),
        newUsername: newUsername.trim(),
        ...(newPassword ? { newPassword } : {})
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSecSuccess("Chief Librarian profile settings & credentials updated successfully!");
        setSuccessReportName({
          prev: previousName,
          curr: data.name || newName.trim()
        });
        
        // Persist token & sync UI components across application immediately
        if (data.token) {
          localStorage.setItem("ramdiri_library_token", data.token);
        }
        if (onUpdateLoggedInName && data.name) {
          onUpdateLoggedInName(data.name);
        }
        
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
      tabStudyMaterials: "Digital Study Notes",
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
      tabStudyMaterials: "डिजिटल अध्ययन नोट्स",
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

  // Dynamic Category Serial Numbering Map for shelf tracking
  const categorySerialsMap = useMemo(() => {
    const map = new Map<string, number>();
    const groups: { [cat: string]: Book[] } = {};
    for (const b of books) {
      const cat = b.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        const idA = a.accessionNumber || a.bookId;
        const idB = b.accessionNumber || b.bookId;
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      groups[cat].forEach((b, idx) => {
        map.set(b.bookId, idx + 1);
      });
    }
    return map;
  }, [books]);

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

  const filteredBooks = useMemo(() => {
    let list = books;
    if (bookSearch.trim()) {
      list = searchBooksSmart(books, bookSearch, categorySerialsMap);
    }
    if (selectedCategoryFilter) {
      list = list.filter(b => {
        const cat = (b.category || "").toLowerCase().trim();
        const fCat = selectedCategoryFilter.toLowerCase().trim();
        if (cat === fCat) return true;
        if (fCat === 'social science' && cat.includes('social science')) return true;
        if (fCat === 'history' && cat.includes('history')) return true;
        return cat.includes(fCat);
      });
    }

    // Apply Dewey Decimal Classification (DDC) Range Filters
    if (ddcRangeFilter && ddcRangeFilter !== 'all') {
      const [minStr, maxStr] = ddcRangeFilter.split('-');
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      list = list.filter(b => {
        if (!b.callNumber) return false;
        const match = b.callNumber.match(/^([0-9.]+)/);
        if (match) {
          const val = parseFloat(match[1]);
          return val >= min && val <= max;
        }
        return false;
      });
    }

    // Apply Sorting for Excel Datasheet view
    if (catalogSortField) {
      list = [...list].sort((a, b) => {
        let valA = a[catalogSortField as keyof Book];
        let valB = b[catalogSortField as keyof Book];

        if (catalogSortField === 'categorySerial') {
          valA = categorySerialsMap.get(a.bookId) || 0;
          valB = categorySerialsMap.get(b.bookId) || 0;
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return catalogSortOrder === 'asc' ? valA - valB : valB - valA;
        }

        if (catalogSortField === 'bookId') {
          const numA = parseInt(String(valA).replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(valB).replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) {
            return catalogSortOrder === 'asc' ? numA - numB : numB - numA;
          }
        }

        const strA = String(valA).toLowerCase().trim();
        const strB = String(valB).toLowerCase().trim();
        const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        return catalogSortOrder === 'asc' ? comp : -comp;
      });
    }

    return list;
  }, [books, bookSearch, categorySerialsMap, selectedCategoryFilter, ddcRangeFilter, catalogSortField, catalogSortOrder]);

  // FUZZY SEARCH INITIALIZATION: Students database
  const fuseStudents = useMemo(() => {
    return new Fuse(students, {
      keys: ['name', 'rollNumber', 'class', 'section'],
      threshold: 0.35,
      ignoreLocation: true
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (studentSearch.trim()) {
      const query = studentSearch.trim().toLowerCase();
      const numMatch = parseInt(query, 10);
      if (!isNaN(numMatch)) {
        result = students.filter(s => s.rollNumber === numMatch || (s.studentId && s.studentId.includes(query)));
      } else {
        result = fuseStudents.search(studentSearch).map(res => res.item);
      }
    }

    if (filterClass) {
      result = result.filter(s => String(s.class).trim() === filterClass.trim());
    }

    if (filterSection) {
      result = result.filter(s => String(s.section).trim().toUpperCase() === filterSection.trim().toUpperCase());
    }

    return result;
  }, [students, studentSearch, fuseStudents, filterClass, filterSection]);

  // Pagination lists for superb UI rendering performance under load
  const paginatedBooks = useMemo(() => {
    const startIdx = (booksPage - 1) * 12;
    return filteredBooks.slice(startIdx, startIdx + 12);
  }, [filteredBooks, booksPage]);

  const paginatedStudents = useMemo(() => {
    const startIdx = (studentsPage - 1) * 15;
    return filteredStudents.slice(startIdx, startIdx + 15);
  }, [filteredStudents, studentsPage]);

  const paginatedLoans = useMemo(() => {
    const startIdx = (activeLoansPage - 1) * 15;
    return activeLoans.slice(startIdx, startIdx + 15);
  }, [activeLoans, activeLoansPage]);

  // Search timing benchmarking hooks
  useEffect(() => {
    const t0 = performance.now();
    const resCount = bookSearch.trim() ? searchBooksSmart(books, bookSearch, categorySerialsMap).length : books.length;
    const t1 = performance.now();
    setBookSearchElapsed(parseFloat(Math.max(0.01, t1 - t0).toFixed(2)));
  }, [bookSearch, books, categorySerialsMap]);

  useEffect(() => {
    const t0 = performance.now();
    const resCount = studentSearch.trim() ? fuseStudents.search(studentSearch).length : students.length;
    const t1 = performance.now();
    setStudentSearchElapsed(parseFloat(Math.max(0.01, t1 - t0).toFixed(2)));
  }, [studentSearch, students, fuseStudents]);

  // General reusable pagination controller renderer
  const renderPagination = (currentPage: number, totalItems: number, pageSize: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 text-xs text-slate-500 dark:text-slate-400 gap-3">
        <span>
          Showing <b>{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</b> to <b>{Math.min(totalItems, currentPage * pageSize)}</b> of <b>{totalItems}</b> items found
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 dark:text-slate-205 font-bold rounded cursor-pointer transition-all text-[10px]"
          >
            ← First
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-205 font-bold rounded cursor-pointer transition-all text-[10px]"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 font-mono text-[10px] font-extrabold bg-slate-900 dark:bg-slate-700 text-white rounded select-none">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-205 font-bold rounded cursor-pointer transition-all text-[10px]"
          >
            Next
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-205 font-bold rounded cursor-pointer transition-all text-[10px]"
          >
            Last →
          </button>
        </div>
      </div>
    );
  };

  // Find walk-in student for instant manual lookup and verification display
  const matchedWalkinStudent = useMemo(() => {
    if (!walkinRoll) return null;
    const rNum = parseInt(walkinRoll);
    if (isNaN(rNum)) return null;
    return students.find(s => 
      s.class === walkinClass && 
      s.section === walkinSection && 
      s.rollNumber === rNum
    );
  }, [students, walkinClass, walkinSection, walkinRoll]);

  // Instant fuzzy filtering for walk-in circulation selection desk
  const filteredWalkinBooks = useMemo(() => {
    if (!walkinBookSearchQuery.trim()) return [];
    const availableBooksOnly = books.filter(b => b.availableCopies > 0);
    return searchBooksSmart(availableBooksOnly, walkinBookSearchQuery, categorySerialsMap);
  }, [books, walkinBookSearchQuery, categorySerialsMap]);

  // Handle direct manual checkout submitting
  const handleManualIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roll = parseInt(walkinRoll);
    if (!walkinRoll || isNaN(roll)) {
      alert(currentLang === 'EN' ? "Please enter a valid Roll Number." : "कृपया एक मान्य रॉल नंबर दर्ज करें।");
      return;
    }
    if (walkinBookIds.length === 0) {
      alert(currentLang === 'EN' ? "Please select at least one book to issue." : "कृपया जारी करने के लिए कम से कम एक पुस्तक चुनें।");
      return;
    }
    if (!walkinDueDate) {
      alert(currentLang === 'EN' ? "Please choose a physical Return Due Date from the calendar." : "कृपया कैलेंडर से एक भौतिक वापसी तिथि चुनें।");
      return;
    }

    const matchedStudent = matchedWalkinStudent;
    if (!matchedStudent) {
      alert(currentLang === 'EN' 
        ? "Failure: Student with this Class, Section, and Roll Number is not registered in school records. Please import students first."
        : "विफलता: इस वर्ग, सेक्शन और रॉल नंबर का छात्र स्कूल डेटाबेस में पंजीकृत नहीं है। कृपया पहले छात्र सूची आयात करें।"
      );
      return;
    }

    // Verify all selected books have available copies on the client side before proceeding
    const selectedBooks = books.filter(b => walkinBookIds.includes(b.bookId));
    const outOfStock = selectedBooks.filter(b => b.availableCopies <= 0);
    if (outOfStock.length > 0) {
      const names = outOfStock.map(b => `'${b.bookName}'`).join(', ');
      alert(currentLang === 'EN'
        ? `The following books are out of stock: ${names}`
        : `निम्नलिखित पुस्तकें स्टॉक में नहीं हैं: ${names}`
      );
      return;
    }

    if (onBulkIssue) {
      const result = await onBulkIssue({
        rollNumber: matchedStudent.rollNumber.toString(),
        class: matchedStudent.class,
        section: matchedStudent.section,
        studentName: matchedStudent.name,
        bookIds: walkinBookIds,
        dueDate: walkinDueDate
      });

      if (result.success) {
        setWalkinRoll('');
        setWalkinBookIds([]);
        setWalkinBookSearchQuery('');
        alert(currentLang === 'EN'
          ? `Successfully issued ${selectedBooks.length} book(s) to student '${matchedStudent.name}'! Return due date is set to ${walkinDueDate}.`
          : `${selectedBooks.length} पुस्तक(पुस्तकें) सफलतापूर्वक छात्र '${matchedStudent.name}' को जारी कर दी गयी! वापसी तिथि ${walkinDueDate} तय की गयी है।`
        );
      } else {
        alert(currentLang === 'EN'
          ? `Fail: ${result.error}`
          : `विफलता: ${result.error}`
        );
      }
    } else {
      alert("Error: Bulk issue engine not available.");
    }
  };

  const handleBookFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAuthor.trim() || !formPublisher.trim() || !formAccessionNumber.trim()) {
      alert("Please fill in: Title (Book Name), Author, Publisher, and Accession Number.");
      return;
    }

    const copies = parseInt(formCopies.toString()) || 1;
    const finalAccession = formAccessionNumber.trim();

    const bookPayload: Book = {
      bookId: finalAccession, // primary unique ID matches Accession Number
      bookName: formName.trim(),
      author: formAuthor.trim(),
      publisher: formPublisher.trim(),
      category: formCategory,
      description: formDescription || "Syllabus resource item.",
      totalCopies: copies,
      availableCopies: editingBook ? Math.max(0, Math.min(copies, editingBook.availableCopies + (copies - editingBook.totalCopies))) : copies,
      accessionNumber: finalAccession,
      yearOfPublication: formYearOfPublication.trim(),
      placeOfPublication: formPlaceOfPublication.trim(),
      editor: formEditor.trim(),
      edition: formEdition.trim(),
      volume: formVolume.trim(),
      pages: formPages.trim(),
      price: formPrice.trim(),
      callNumber: formCallNumber.trim(),
      bookNumber: formBookNumber.trim(),
      source: formSource.trim(),
      remarks: formRemarks.trim(),
      ddcNumber: formDdcNumber.trim()
    };

    if (editingBook) {
      onEditBook(bookPayload);
      setEditingBook(null);
    } else {
      // Prevent duplicate accession numbers manually
      const isDuplicate = books.some(b => b.bookId === finalAccession || b.accessionNumber === finalAccession);
      if (isDuplicate) {
        alert(`Data Integrity Guard: A book record with Accession Number "${finalAccession}" already exists in the system. Duplicate entries are prohibited.`);
        return;
      }
      onAddBook(bookPayload);
    }

    setFormName('');
    setFormAuthor('');
    setFormPublisher('');
    setFormCategory('Academic');
    setFormDescription('');
    setFormCopies(5);
    setFormAccessionNumber('');
    setFormYearOfPublication('');
    setFormPlaceOfPublication('');
    setFormEditor('');
    setFormEdition('');
    setFormVolume('');
    setFormPages('');
    setFormPrice('');
    setFormCallNumber('');
    setFormBookNumber('');
    setFormSource('');
    setFormRemarks('');
    setFormDdcNumber('');
    setShowBookForm(false);
  };

  const openBookEdit = (book: Book) => {
    setEditingBook(book);
    setFormName(book.bookName || '');
    setFormAuthor(book.author || '');
    setFormPublisher(book.publisher || '');
    setFormCategory(book.category || 'Academic');
    setFormDescription(book.description || '');
    setFormCopies(book.totalCopies || 1);
    setFormAccessionNumber(book.accessionNumber || book.bookId || '');
    setFormYearOfPublication(book.yearOfPublication || '');
    setFormPlaceOfPublication(book.placeOfPublication || '');
    setFormEditor(book.editor || '');
    setFormEdition(book.edition || '');
    setFormVolume(book.volume || '');
    setFormPages(book.pages || '');
    setFormPrice(book.price || '');
    setFormCallNumber(book.callNumber || '');
    setFormBookNumber(book.bookNumber || '');
    setFormSource(book.source || '');
    setFormRemarks(book.remarks || '');
    setFormDdcNumber(book.ddcNumber || '');
    setShowBookForm(true);
  };

  const handleDdcChange = (val: string) => {
    setFormDdcNumber(val);
    const trimStr = val.trim();
    if (trimStr === "") {
      setFormCategory("Needs Librarian Review");
      return;
    }
    const numMatch = trimStr.match(/^\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      if (!isNaN(num)) {
        if (num >= 0 && num < 100) setFormCategory("000 General Works");
        else if (num >= 100 && num < 200) setFormCategory("100 Philosophy");
        else if (num >= 200 && num < 300) setFormCategory("200 Religion");
        else if (num >= 300 && num < 400) setFormCategory("300 Social Sciences");
        else if (num >= 400 && num < 500) setFormCategory("400 Language");
        else if (num >= 500 && num < 600) setFormCategory("500 Science");
        else if (num >= 600 && num < 700) setFormCategory("600 Technology");
        else if (num >= 700 && num < 800) setFormCategory("700 Arts");
        else if (num >= 800 && num < 900) setFormCategory("800 Literature");
        else if (num >= 900 && num < 1000) setFormCategory("900 History & Geography");
        else setFormCategory("Needs Librarian Review");
        return;
      }
    }
    setFormCategory("Needs Librarian Review");
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedPdf(file);
    }
  };

  const processSelectedPdf = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Only PDF documents are supported for digital study notes.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Maximum file size is 5MB.');
      return;
    }
    setUploadingPdf(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPdfBase64(reader.result as string);
      setPdfFileName(file.name);
      setUploadingPdf(false);
    };
    reader.onerror = () => {
      alert('Error reading PDF file.');
      setUploadingPdf(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) {
      alert("Please enter a Title.");
      return;
    }
    if (!pdfBase64) {
      alert("Please upload a PDF document for this study resource.");
      return;
    }
    setSubmittingMaterial(true);
    try {
      if (onAddStudyMaterial) {
        const success = await onAddStudyMaterial({
          title: matTitle.trim(),
          description: matDescription.trim(),
          visibleTo: matVisibleTo,
          expiryDate: matExpiryDate,
          pdfData: pdfBase64,
          pdfName: pdfFileName
        });
        if (success) {
          setMatTitle('');
          setMatDescription('');
          setMatVisibleTo('All');
          setPdfBase64('');
          setPdfFileName('');
          alert("Digital study notes successfully published!");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingMaterial(false);
    }
  };

  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studName.trim() || !studRoll.trim() || !studClass.trim() || !studSection.trim() || !studDOB.trim()) {
      alert("Please fill all required student parameters.");
      return;
    }

    // Generate unique Student ID: Class-Section-RollNumber
    const studentId = `${studClass.trim()}-${studSection.trim().toUpperCase()}-${studRoll.trim()}`;

    // Verify duplication client-side to raise warning
    if (!editingStudent) {
      const isDuplicate = students.some(s => s.studentId === studentId);
      if (isDuplicate) {
        alert(`Duplicate Registry: A student with Class ${studClass.trim()}, Section ${studSection.trim().toUpperCase()}, and Roll Number ${studRoll.trim()} is already registered.`);
        return;
      }
    }

    const payload: Student = {
      studentId,
      name: studName.trim(),
      class: studClass.trim(),
      section: studSection.trim().toUpperCase(),
      rollNumber: parseInt(studRoll.trim(), 10) || 0,
      dob: studDOB.trim(),
      pin: editingStudent ? (editingStudent.pin || '1234') : '1234'
    };

    let success = false;
    if (editingStudent) {
      success = await onEditStudent(payload);
    } else {
      success = await onAddStudent(payload);
    }

    if (success) {
      setStudName('');
      setStudClass('10');
      setStudSection('A');
      setStudRoll('');
      setStudDOB('2010-01-01');
      setShowStudentForm(false);
      setEditingStudent(null);
    }
  };

  const openStudentEdit = (stud: Student) => {
    setEditingStudent(stud);
    setStudName(stud.name || '');
    setStudClass(stud.class || '10');
    setStudSection(stud.section || 'A');
    setStudRoll(stud.rollNumber ? stud.rollNumber.toString() : '');
    setStudDOB(stud.dob || '2010-01-01');
    setShowStudentForm(true);
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

      {/* CUSTOM CONFIRMATION OVERLAY MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl rounded-2xl flex flex-col scale-in-center">
            
            <div className="bg-red-650 text-white p-4.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="font-extrabold text-xs uppercase tracking-wider select-none">
                {confirmModal.title}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-medium">
                {confirmModal.message}
              </p>

              {confirmModal.requireInput && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-500 uppercase block">
                    Please type <b className="text-red-650 font-mono select-all">'{confirmModal.requireInput}'</b> to authorize:
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={`Type ${confirmModal.requireInput} here`}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-250 outline-none text-slate-900 font-mono uppercase font-black tracking-widest text-center focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setConfirmModal(null); setConfirmInput(''); }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-650 rounded-lg cursor-pointer transition-all"
                >
                  Cancel Action
                </button>
                <button
                  type="button"
                  onClick={handleCustomConfirmExecute}
                  disabled={!!confirmModal.requireInput && confirmInput.trim().toUpperCase() !== confirmModal.requireInput}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg cursor-pointer select-none tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM STATUS ALERT OVERLAY */}
      {alertOverlay && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 max-w-sm w-full overflow-hidden shadow-2xl rounded-2xl flex flex-col">
            
            <div className={`p-4 flex items-center gap-2 text-white ${
              alertOverlay.type === 'error' ? 'bg-red-600' : alertOverlay.type === 'success' ? 'bg-emerald-650' : 'bg-slate-950'
            }`}>
              {alertOverlay.type === 'error' ? <XCircle className="w-5 h-5" /> : alertOverlay.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {alertOverlay.title}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                {alertOverlay.message}
              </p>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAlertOverlay(null)}
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all tracking-wider"
                >
                  Acknowledge
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* 0. SYSTEM STATUS MONITOR */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs animate-fade-in" id="system-status-monitor">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0d4d2d] dark:text-emerald-400 text-xs tracking-wider uppercase">
                {currentLang === 'HI' ? "सिस्टम स्थिति:" : "System Status:"}
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-400 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-250">
                {currentLang === 'HI' ? "सक्रिय" : "Active"}
              </span>
            </div>
            <p className="text-xs text-slate-705 dark:text-slate-300">
              {currentLang === 'HI' 
                ? "स्कूल पुस्तकालय पोर्टल पूरी तरह से चालू है। सभी पुस्तकें कैटलॉग और छात्र रिकॉर्ड सुरक्षित हैं।" 
                : "The school library portal is fully operational. All book catalogs, student records, and borrow requests are safely updated."}
            </p>
          </div>
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

      {/* 5 core metrics row fully interactive */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" id="librarian-metrics-bar">
        {/* Metric 1: Books Available */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            Books Available / उपलब्ध पुस्तकें
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 block mt-1">
            {totalAvailableCopies}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Ready for shelf issuance</span>
        </div>
        
        {/* Metric 2: Books Issued (Clickable Details) */}
        <div 
          onClick={() => setShowIssuedModal(true)}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-700/25 hover:border-indigo-800 p-4 rounded-xl shadow-xs hover:shadow-sm cursor-pointer transition-all select-none group relative"
          id="kpi-issued-books-clickable"
          title="Click to view detailed Issued Books index"
        >
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block flex items-center justify-between">
            <span>Books Issued / जारी पुस्तकें 👆</span>
            <span className="text-[9px] bg-slate-900 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">View</span>
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-700 block mt-1 font-mono">
            {totalIssuedCopies}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1 underline decoration-dashed">
            Check loan list & history
          </span>
        </div>

        {/* Metric 3: Pending Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            Pending Requests / लंबित अनुरोध
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 block mt-1">
            {pendingRequestsCount}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Awaiting desk action</span>
        </div>

        {/* Metric 4: Overdue Books */}
        <div 
          onClick={() => setShowIssuedModal(true)}
          className={`bg-white dark:bg-slate-900 border p-4 rounded-xl shadow-xs transition-all cursor-pointer select-none ${
            overdueLogs.length > 0 
              ? 'border-red-300 dark:border-red-900/60 bg-red-50/15 hover:border-red-500' 
              : 'border-slate-205 dark:border-slate-800 hover:border-slate-400'
          }`}
          title="Click to view overdues in Issuance logs"
        >
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            Overdue Books / देय तिथि पार
          </span>
          <span className={`text-xl sm:text-2xl font-extrabold block mt-1 ${overdueLogs.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {overdueLogs.length}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1 font-sans">Required recovery attention</span>
        </div>

        {/* Metric 5: Registered Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none font-[sans]">
          <span className="text-slate-400 dark:text-slate-500 font-bold tracking-wider text-[10px] uppercase block">
            Registered Students / नामांकित छात्र
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-blue-650 dark:text-blue-400 block mt-1">
            {students.length}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">Authorized portal logins</span>
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
          onClick={() => { setActiveTab('study-materials'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'study-materials'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>{t.tabStudyMaterials || "Digital Notes"}</span>
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

        <button
          onClick={() => { setActiveTab('database'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'database'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-11 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>System Status</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}      {/* BOOKS TAB PANEL */}
      {activeTab === 'books' && (
        <div className="space-y-6" id="tab-books-content">
          
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={bookSearchInput}
                  onChange={(e) => setBookSearchInput(e.target.value)}
                  placeholder={t.bookSearchPlaceholder}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-205 rounded-lg outline-none focus:ring-1 focus:focus:ring-slate-805 animate-fade-in text-slate-900"
                />
              </div>

              {/* DDC Numerical Range Classifier Selector */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-1 px-2.5 rounded-lg border border-slate-150 dark:border-slate-805">
                <span className="text-[10px] font-black uppercase text-slate-450 shrink-0 font-mono">DDC Range Filter:</span>
                <select
                  value={ddcRangeFilter}
                  onChange={(e) => {
                    setDdcRangeFilter(e.target.value);
                    setBooksPage(1);
                  }}
                  className="text-[11px] bg-transparent border-none text-slate-700 dark:text-slate-305 font-mono cursor-pointer outline-none focus:ring-0 max-w-[170px]"
                  id="ddc-call-range-selector"
                >
                  <option value="all">📁 All Ranges (000-999)</option>
                  <option value="000-099">000-099 General/IT</option>
                  <option value="100-199">100-199 Philosophy</option>
                  <option value="200-299">200-299 Religion</option>
                  <option value="300-399">300-399 Social Sciences</option>
                  <option value="400-499">400-499 Language</option>
                  <option value="500-599">500-599 Science & Math</option>
                  <option value="600-699">600-699 Technology</option>
                  <option value="700-799">700-799 Arts & Rec</option>
                  <option value="800-899">800-899 Literature</option>
                  <option value="900-999">900-999 History/Geography</option>
                </select>
              </div>

              {/* High-density layout toggler keys */}
              <div className="flex bg-slate-100 dark:bg-slate-805 p-1 rounded-lg border border-slate-205 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('grid')}
                  className={`px-3 py-1.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 transition-all cursor-pointer ${catalogViewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                  <LayoutGrid className="w-3 h-3 text-slate-455" />
                  <span>Cards View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('table')}
                  className={`px-3 py-1.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 transition-all cursor-pointer ${catalogViewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'}`}
                  id="btn-excel-table-mode"
                >
                  <Grid className="w-3 h-3 text-indigo-550 shrink-0" />
                  <span>Excel Table View</span>
                </button>
              </div>
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

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between select-none">
            <span>Books found: {filteredBooks.length} filtered ({books.length} total in records)</span>
            <span>Fuse Search Index benchmark lookup: <b>{bookSearchElapsed}ms</b></span>
          </div>

          {/* DDC CLASSIFICATION INSTANT QUICK FILTER SHELF */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-2.5 animate-fade-in select-none">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              DDC classification categories:
            </span>
            <div className="flex flex-wrap gap-1.5" id="ddc-classification-filters">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('');
                  setBooksPage(1);
                }}
                className={`px-3 py-1 text-[11px] rounded-full font-bold transition-all cursor-pointer ${
                  selectedCategoryFilter === ''
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-700 text-slate-705 dark:text-slate-300'
                }`}
              >
                All Books ({books.length})
              </button>
              {[
                { name: "000 General Works", label: "000 General Works" },
                { name: "100 Philosophy", label: "100 Philosophy" },
                { name: "200 Religion", label: "200 Religion" },
                { name: "300 Social Sciences", label: "300 Social Sciences" },
                { name: "400 Language", label: "400 Language" },
                { name: "500 Science", label: "500 Science" },
                { name: "600 Technology", label: "600 Technology" },
                { name: "700 Arts", label: "700 Arts" },
                { name: "800 Literature", label: "800 Literature" },
                { name: "900 History & Geography", label: "900 History & Geography" },
                { name: "Needs Librarian Review", label: "Needs Librarian Review" }
              ].map(cat => {
                const count = books.filter(b => {
                  const bCat = (b.category || "").toLowerCase().trim();
                  const fCat = cat.name.toLowerCase().trim();
                  return bCat === fCat || bCat.includes(fCat);
                }).length;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.name);
                      setBooksPage(1);
                    }}
                    className={`px-3 py-1 text-[11px] rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryFilter === cat.name
                        ? 'bg-indigo-900 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-700 text-slate-705 dark:text-slate-300'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                      selectedCategoryFilter === cat.name
                        ? 'bg-indigo-805 text-indigo-100'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BULK SELECTION CONTROLS PANEL */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                id="bulk-select-all-books"
                checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selectedBookIds.includes(b.bookId))}
                onChange={(e) => {
                  if (e.target.checked) {
                    const visibleIds = filteredBooks.map(b => b.bookId);
                    setSelectedBookIds(prev => {
                      const merged = new Set([...prev, ...visibleIds]);
                      return Array.from(merged);
                    });
                  } else {
                    const visibleIds = filteredBooks.map(b => b.bookId);
                    setSelectedBookIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  }
                }}
                className="w-4 h-4 rounded border-slate-350 text-slate-800 focus:ring-slate-800 cursor-pointer"
              />
              <label htmlFor="bulk-select-all-books" className="text-xs font-bold text-slate-705 dark:text-slate-305 cursor-pointer select-none">
                Select All Filtered Books ({filteredBooks.length})
              </label>
              {selectedBookIds.length > 0 && (
                <span className="text-[11px] bg-slate-200 dark:bg-slate-805 text-slate-800 dark:text-slate-205 font-extrabold px-2.5 py-0.5 rounded font-mono">
                  {selectedBookIds.length} Selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedBookIds.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        type: 'delete-selected-books',
                        title: 'Bulk Delete Selected Book Assets',
                        message: `Are you sure you want to permanently delete these ${selectedBookIds.length} selected book items from school library registers?`,
                        confirmLabel: 'Delete Selected Items',
                        targetId: selectedBookIds
                      });
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                    id="delete-selected-books-bulk-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedBookIds.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedBookIds([])}
                    className="px-3 py-2 border border-slate-250 hover:bg-slate-50 text-slate-650 font-bold text-xs rounded-lg transition-all cursor-pointer select-none"
                  >
                    Clear Selection
                  </button>
                </>
              )}

              <div className="flex flex-col items-end gap-1 ml-auto">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Books: {books.length}
                </span>
                <button
                  onClick={() => {
                    setConfirmModal({
                      type: 'clear-books',
                      title: 'Wipe All Book Records',
                      message: `CRITICAL SECURE DIRECTIVE: Are you sure you want to delete ALL ${books.length} book records? This will clear all accessions, shelfs, and call allocations. This action is irreversible. Please type 'DELETE ALL BOOKS' exactly to confirm:`,
                      confirmLabel: 'Wipe Entire Catalog',
                      requireInput: 'DELETE ALL BOOKS'
                    });
                  }}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-105 hover:text-red-800 border-2 border-dashed border-red-300 dark:border-red-900 text-red-700 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
                  id="delete-entire-inventory-btn"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-650 shrink-0" />
                  <span>Delete Entire Inventory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Book Catalog list */}
          {catalogViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedBooks.map(book => (
              <div 
                key={book.bookId}
                className={`bg-white dark:bg-slate-900 border ${selectedBookIds.includes(book.bookId) ? 'border-amber-500 bg-amber-50/20' : 'border-slate-205 dark:border-slate-800'} p-4 rounded-xl shadow-xs flex gap-4 animate-fade-in transition-all relative`}
              >
                <div className="flex flex-col items-center justify-start shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={selectedBookIds.includes(book.bookId)}
                    onChange={() => {
                      if (selectedBookIds.includes(book.bookId)) {
                        setSelectedBookIds(prev => prev.filter(id => id !== book.bookId));
                      } else {
                        setSelectedBookIds(prev => [...prev, book.bookId]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-350 text-amber-600 focus:focus:ring-amber-500 cursor-pointer mb-2.5"
                  />
                  <div className="w-16">
                    <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                  </div>
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
                    
                    {/* Shelf Order Location Desk Indicator Badges */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5 bg-indigo-50/50 dark:bg-slate-950 p-2 rounded-lg border border-indigo-100/60 dark:border-slate-800/80 font-mono text-[9.5px]">
                      <div><span className="text-slate-400">Shelf Sr #:</span> <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{categorySerialsMap.get(book.bookId) || 1}</span></div>
                      <div><span className="text-slate-400">Serial #:</span> <span className="font-black text-indigo-700 dark:text-amber-400">#{book.bookId}</span></div>
                      <div><span className="text-slate-400 font-bold">Acc #:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{book.accessionNumber || book.bookId || "N/A"}</span></div>
                      <div><span className="text-slate-400">Call #:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{book.callNumber || "N/A"}</span></div>
                      <div><span className="text-slate-400 font-mono">Book #:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{book.bookNumber || "N/A"}</span></div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <button
                        onClick={() => setExpandedBookId(expandedBookId === book.bookId ? null : book.bookId)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer select-none"
                      >
                        <span>{expandedBookId === book.bookId ? "Hide Metadata Details ▲" : "View Entire Register Record Details ▼"}</span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedProfileBook(book)}
                        className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer select-none"
                        title="View Book History Trails"
                        id={`btn-view-book-history-${book.bookId}`}
                      >
                        <span>📊 VIEW BOOK LOGS & TRAILS ↗</span>
                      </button>
                    </div>
                    
                    {expandedBookId === book.bookId && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800 text-[10px] space-y-1.5 text-slate-600 dark:text-slate-300 font-mono animate-fade-in">
                        <div><b className="text-slate-500">Accession Number:</b> {book.accessionNumber || book.bookId || "N/A"}</div>
                        <div><b className="text-slate-500">Call Number:</b> {book.callNumber || "N/A"}</div>
                        <div><b className="text-slate-500">DDC Mapping:</b> {book.ddcCategory || "Generalities"}</div>
                        {book.bookNumber && <div><b className="text-slate-500">Book Number:</b> {book.bookNumber}</div>}
                        {book.yearOfPublication && <div><b className="text-slate-500 font-mono">Published:</b> {book.yearOfPublication} {book.placeOfPublication ? `at ${book.placeOfPublication}` : ""}</div>}
                        {book.editor && <div><b className="text-slate-500 font-mono">Editor:</b> {book.editor}</div>}
                        {book.edition && <div><b className="text-slate-500 font-mono">Edition:</b> {book.edition}</div>}
                        {book.volume && <div><b className="text-slate-500 font-mono">Volume:</b> {book.volume}</div>}
                        {book.pages && <div><b className="text-slate-500 font-mono">Pages:</b> {book.pages} pages</div>}
                        {book.price && <div><b className="text-slate-500 font-mono">Price:</b> ₹{book.price}</div>}
                        {book.source && <div><b className="text-slate-500 font-mono">Source:</b> {book.source}</div>}
                        {book.remarks && <div><b className="text-slate-500 font-mono">Remarks:</b> {book.remarks}</div>}
                        <div><b className="text-slate-500 font-mono">Category Tab:</b> {book.category}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                    <span className="text-[11px] text-slate-400">
                      Copies: <b className="text-slate-800 dark:text-slate-150 font-mono">{book.availableCopies} available</b> / {book.totalCopies} total
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
                          setConfirmModal({
                            type: 'delete-book',
                            title: 'Permanently Delete Book Profile',
                            message: `Are you sure you want to permanently delete the book '${book.bookName}' (Accession ID: ${book.bookId}, Author: ${book.author}) from the school library indexing catalog? This action cannot be reversed.`,
                            confirmLabel: 'Confirm and Delete Book',
                            targetId: book.bookId
                          });
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-650 cursor-pointer"
                        title="Delete Book"
                        id={`delete-single-book-${book.bookId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-slate-300 dark:border-slate-800 rounded-xl shadow-xs text-xs animate-fade-in bg-slate-50 dark:bg-slate-950/40">
              <table className="w-full text-left border-collapse bg-white dark:bg-slate-900 min-w-[1550px]" id="librarian-books-table">
                <thead className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[10px] select-none border-b-2 border-slate-950">
                  <tr>
                    <th className="p-3 border border-slate-800 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={paginatedBooks.length > 0 && paginatedBooks.every(b => selectedBookIds.includes(b.bookId))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const visibleIds = paginatedBooks.map(b => b.bookId);
                            setSelectedBookIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                          } else {
                            const visibleIds = paginatedBooks.map(b => b.bookId);
                            setSelectedBookIds(prev => prev.filter(id => !visibleIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 hover:ring-0 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 border border-slate-800 text-center">Serial Number</th>
                    <th className="p-3 border border-slate-800 text-center text-emerald-450 font-bold">Shelf Serial Number</th>
                    <th className="p-3 border border-slate-800 text-center">Accession Number</th>
                    <th className="p-3 border border-slate-800 text-center">Call Number</th>
                    <th className="p-3 border border-slate-800 text-center">Book Number</th>
                    <th className="p-3 border border-slate-800">Book Name</th>
                    <th className="p-3 border border-slate-800">Author</th>
                    <th className="p-3 border border-slate-800 font-sans">Publisher</th>
                    <th className="p-3 border border-slate-800 text-center">Year</th>
                    <th className="p-3 border border-slate-800">Category</th>
                    <th className="p-3 border border-slate-800 text-center">Copies</th>
                    <th className="p-3 border border-slate-800 text-center">Status</th>
                    <th className="p-3 border border-slate-800 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-300 font-medium whitespace-nowrap">
                  {paginatedBooks.map((book) => {
                    const isAvail = book.availableCopies > 0;
                    return (
                      <tr 
                        key={book.bookId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-800 text-xs ${selectedBookIds.includes(book.bookId) ? 'bg-amber-50/20 dark:bg-amber-950/20' : ''}`}
                      >
                        <td className="p-3 text-center border border-slate-250 dark:border-slate-800">
                          <input
                            type="checkbox"
                            checked={selectedBookIds.includes(book.bookId)}
                            onChange={() => {
                              if (selectedBookIds.includes(book.bookId)) {
                                setSelectedBookIds(prev => prev.filter(id => id !== book.bookId));
                              } else {
                                setSelectedBookIds(prev => [...prev, book.bookId]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-900 dark:text-white border border-slate-250 dark:border-slate-800">
                          #{book.bookId}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 border border-slate-250 dark:border-slate-800 bg-emerald-50/20">
                          #{categorySerialsMap.get(book.bookId) || 1}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-indigo-750 dark:text-indigo-400 border border-slate-250 dark:border-slate-800 bg-indigo-50/20">
                          {book.accessionNumber || "-"}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-250 dark:border-slate-800">
                          {book.callNumber || "-"}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-250 dark:border-slate-800">
                          {book.bookNumber || "-"}
                        </td>
                        <td className="p-3 border border-slate-250 dark:border-slate-800 font-extrabold text-slate-950 dark:text-white max-w-[220px] truncate" title={book.bookName}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 shrink-0 select-none">
                              <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                            </div>
                            <span className="truncate">{book.bookName}</span>
                          </div>
                        </td>
                        <td className="p-3 border border-slate-250 dark:border-slate-800 italic max-w-[130px] truncate" title={book.author}>
                          {book.author}
                        </td>
                        <td className="p-3 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={book.publisher}>
                          {book.publisher || "-"}
                        </td>
                        <td className="p-3 border border-slate-250 dark:border-slate-800 font-mono text-center">
                          {book.yearOfPublication || "-"}
                        </td>
                        <td className="p-3 border border-slate-250 dark:border-slate-800">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-800">{book.category}</span>
                        </td>
                        <td className="p-3 text-center border border-slate-250 dark:border-slate-800 font-mono">
                          <span className={`px-2 py-1 rounded bg-slate-100 font-black text-[10px]`}>
                            {book.availableCopies} / {book.totalCopies}
                          </span>
                        </td>
                        <td className="p-3 text-center border border-slate-250 dark:border-slate-800 font-sans">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {isAvail ? 'Available' : 'Checked Out'}
                          </span>
                        </td>
                        <td className="p-3 text-center border border-slate-250 dark:border-slate-800">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openBookEdit(book)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all border border-slate-300"
                              title="Edit specs"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  type: 'delete-book',
                                  title: 'Permanently Delete Book Profile',
                                  message: `Are you sure you want to permanently delete the book '${book.bookName}' (Serial ID: ${book.bookId}) from the collection catalog?`,
                                  confirmLabel: 'Confirm and Delete Book',
                                  targetId: book.bookId
                                });
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all border border-red-200"
                              title="Delete Book"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedProfileBook(book)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-705 text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all border border-indigo-200"
                              title="Audit history"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>History</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedBooks.length === 0 && (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-slate-400 font-sans">No book records map to current filters inside this Excel range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredBooks.length === 0 && (
            <p className="py-12 bg-white dark:bg-slate-900 text-center rounded-xl border text-slate-400 text-xs">No matching title or category found in library index.</p>
          )}

          {renderPagination(booksPage, filteredBooks.length, 12, setBooksPage)}

          {/* Excel Importer segment specifically for books */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">
              {t.excelModuleTitle}
            </h3>
            <ExcelModule
              onImportBooks={handleExcelBooksImported}
              onImportStudents={handleExcelStudentsImported}
              currentLang={currentLang}
              existingBooks={books}
              existingStudents={students}
            />
          </div>

        </div>
      )}

      {/* STUDENTS TAB PANEL */}
      {activeTab === 'students' && (
        <div className="space-y-6" id="tab-students-content">
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md animate-fade-in">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={studentSearchInput}
                onChange={(e) => setStudentSearchInput(e.target.value)}
                placeholder={t.studentSearchPlaceholder}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-205 rounded-lg outline-none focus:ring-1 focus:ring-slate-800 text-slate-900"
              />
            </div>
            
            <button
              onClick={() => {
                setEditingStudent(null);
                setStudName('');
                setStudClass('10');
                setStudSection('A');
                setStudRoll('');
                setStudDOB('2010-01-01');
                setShowStudentForm(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs select-none"
              type="button"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Enroll Student Manually</span>
            </button>
          </div>

          {/* QUICK CHANNELS CLASS & SECTION SELECTORS */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row gap-4 sm:items-center select-none animate-fade-in">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Filter by class & section:
            </span>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Class:</span>
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setStudentsPage(1);
                  }}
                  className="text-xs p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 font-bold outline-none text-slate-800 dark:text-slate-200"
                  id="filter-student-class-select"
                >
                  <option value="">All Classes (Grades 1-12)</option>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(cls => (
                    <option key={cls} value={cls}>Grade {cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Section:</span>
                <select
                  value={filterSection}
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setStudentsPage(1);
                  }}
                  className="text-xs p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 font-bold outline-none text-slate-800 dark:text-slate-200"
                  id="filter-student-section-select"
                >
                  <option value="">All Sections</option>
                  {["A", "B", "C", "D", "E"].map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              {(filterClass || filterSection) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterClass('');
                    setFilterSection('');
                    setStudentsPage(1);
                  }}
                  className="text-[11px] font-extrabold text-red-600 hover:text-red-700 underline cursor-pointer transition-all"
                >
                  Reset Filtering Settings
                </button>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between select-none">
            <span>Students found: {filteredStudents.length} filtered ({students.length} total in roster)</span>
            <span>Fuse Search Index benchmark lookup: <b>{studentSearchElapsed}ms</b></span>
          </div>

          {/* BULK SELECTION CONTROLS PANEL FOR STUDENTS */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="checkbox"
                id="bulk-select-all-students"
                checked={filteredStudents.length > 0 && filteredStudents.every(s => {
                  const sId = s.studentId || `${s.class}-${s.section}-${s.rollNumber}`;
                  return selectedStudentIds.includes(sId);
                })}
                onChange={(e) => {
                  if (e.target.checked) {
                    const visibleIds = filteredStudents.map(s => s.studentId || `${s.class}-${s.section}-${s.rollNumber}`);
                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  } else {
                    const visibleIds = filteredStudents.map(s => s.studentId || `${s.class}-${s.section}-${s.rollNumber}`);
                    setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  }
                }}
                className="w-4 h-4 rounded border-slate-350 text-slate-800 focus:ring-slate-800 cursor-pointer"
              />
              <label htmlFor="bulk-select-all-students" className="text-xs font-bold text-slate-705 dark:text-slate-305 cursor-pointer select-none">
                Select All Filtered Students ({filteredStudents.length})
              </label>
              {selectedStudentIds.length > 0 && (
                <span className="text-[11px] bg-indigo-100 dark:bg-indigo-900 text-indigo-805 dark:text-indigo-205 font-extrabold px-2.5 py-0.5 rounded font-mono animate-fade-in">
                  {selectedStudentIds.length} Selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedStudentIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        type: 'delete-selected-students',
                        title: 'Bulk Delete Selected Student Enrollees',
                        message: `Are you sure you want to permanently delete these ${selectedStudentIds.length} selected student accounts from database rosters?`,
                        confirmLabel: 'Delete Selected Students',
                        targetId: selectedStudentIds
                      });
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                    id="delete-selected-students-bulk-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedStudentIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="px-3 py-2 border border-slate-250 hover:bg-slate-55 text-slate-650 font-bold text-xs rounded-lg transition-all cursor-pointer select-none"
                  >
                    Clear Selection
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    type: 'clear-students',
                    title: 'Wipe All Student Records',
                    message: `CRITICAL SECURE DIRECTIVE: Are you sure you want to permanently delete ALL registered student accounts (${students.length}) in this school? This will wipe out all login pins and catalog access credentials. This cannot be undone. Please type 'DELETE ALL STUDENTS' exactly to confirm:`,
                    confirmLabel: 'Wipe Entire Student Roster',
                    requireInput: 'DELETE ALL STUDENTS'
                  });
                }}
                className="px-3 py-2 border-2 border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 text-red-700 font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs select-none"
                id="clear-students-registry-btn"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-650" />
                <span>Delete All ({students.length})</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs animate-fade-in">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500 text-[10px]">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => {
                        const targetId = s.studentId || `${s.class}-${s.section}-${s.rollNumber}`;
                        return selectedStudentIds.includes(targetId);
                      })}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const paginatedIds = paginatedStudents.map(s => s.studentId || `${s.class}-${s.section}-${s.rollNumber}`);
                          setSelectedStudentIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
                        } else {
                          const paginatedIds = paginatedStudents.map(s => s.studentId || `${s.class}-${s.section}-${s.rollNumber}`);
                          setSelectedStudentIds(prev => prev.filter(id => !paginatedIds.includes(id)));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">#</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3 text-center">Class / Section</th>
                  <th className="p-3 text-center">Roll Number</th>
                  <th className="p-3">Date of Birth (DOB)</th>
                  <th className="p-3 text-center">Active Loans</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedStudents.map((stud, idx) => {
                  const checkoutsCount = issueLogs.filter(log => log.rollNumber === stud.rollNumber && log.status === 'Issued').length;
                  const itemIndex = (studentsPage - 1) * 15 + idx + 1;
                  const displayStudentId = stud.studentId || `${stud.class || "10"}-${(stud.section || "A").toUpperCase()}-${stud.rollNumber}`;
                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 transition-all ${selectedStudentIds.includes(displayStudentId) ? 'bg-indigo-50/10' : ''}`}>
                      <td className="p-3 w-8 col-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(displayStudentId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...prev, displayStudentId]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== displayStudentId));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{itemIndex < 10 ? `0${itemIndex}` : itemIndex}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 font-sans">
                        <button
                          type="button"
                          onClick={() => setSelectedProfileStudent(stud)}
                          className="hover:underline text-indigo-700 hover:text-indigo-905 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-left cursor-pointer focus:outline-none focus:ring-0 select-none"
                          title="Click to view full academic library profile history"
                        >
                          {stud.name}
                        </button>
                      </td>
                      <td className="p-3 text-center font-bold">Class {stud.class || "10"}-{stud.section || "A"}</td>
                      <td className="p-3 text-center font-bold font-mono text-indigo-600">#{stud.rollNumber}</td>
                      <td className="p-3 font-mono">{stud.dob}</td>
                      <td className="p-3 text-center font-extrabold text-amber-700 font-mono">
                        {checkoutsCount}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openStudentEdit(stud)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                            title="Edit Student Information"
                            type="button"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                           <button
                             onClick={() => {
                               const targetId = stud.studentId || `${stud.class}-${stud.section}-${stud.rollNumber}`;
                               setConfirmModal({
                                 type: 'delete-student',
                                 title: 'permanently delete student enrollment',
                                 message: `Are you sure you want to permanently delete student '${stud.name}' (Class: ${stud.class}, Section: ${stud.section}, Roll: ${stud.rollNumber}) from rosters database? This cannot be undone.`,
                                 confirmLabel: 'Confirm and Delete Student',
                                 targetId: targetId
                               });
                             }}
                             className="p-1 rounded hover:bg-red-50 text-red-650 transition-all cursor-pointer"
                             title="Delete Student"
                             type="button"
                             id={`delete-single-student-${stud.studentId || `${stud.class}-${stud.section}-${stud.rollNumber}`}`}
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       </td>
                     </tr>
                   );
                 })}
                 {filteredStudents.length === 0 && (
                   <tr>
                     <td colSpan={9} className="p-6 text-center text-slate-400 text-xs font-sans">No students registered in active ledger. Use spreadsheet bulk importer box below to enroll.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
 
           {renderPagination(studentsPage, filteredStudents.length, 15, setStudentsPage)}
 
           {/* Excel Importer segment specifically for student data */}
           <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-4">
             <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">
               {t.excelModuleTitle}
             </h3>
             <ExcelModule
               onImportBooks={handleExcelBooksImported}
               onImportStudents={handleExcelStudentsImported}
               currentLang={currentLang}
               existingBooks={books}
               existingStudents={students}
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
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1.5 select-none font-sans">
                📜 Student Borrow Requests Awaiting Approval
              </h3>

              <div className="divide-y divide-slate-150">
                {requests.filter(r => r.status === 'Pending').map(req => {
                  const currentApproveDate = approvalDates[req.id] || (() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 14);
                    return d.toISOString().split('T')[0];
                  })();
                  return (
                    <div key={req.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div className="space-y-1 text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{req.studentName} (Roll #{req.rollNumber})</span>
                          <span className="text-[10px] bg-slate-100 text-slate-800 px-1.5 rounded font-mono border">RQ ID: {req.id}</span>
                        </div>
                        <p className="text-slate-650">Requested: <b>{req.bookName}</b></p>
                        {req.comment && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded border border-amber-100 font-medium italic mt-1 max-w-md">
                            💡 Student Note: "{req.comment}"
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono block">Date: {req.requestDate}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-center shrink-0 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border p-1 rounded">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block shrink-0">Due:</span>
                          <input
                            type="date"
                            required
                            value={currentApproveDate}
                            onChange={(e) => setApprovalDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="text-[10px] p-1 font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border rounded outline-none w-28"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                          <button
                            onClick={() => setSelectedRequestDetails(req)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-755 font-bold text-xs rounded border border-indigo-200 transition-all cursor-pointer flex items-center gap-1 select-none flex-1 sm:flex-none justify-center"
                            title="Verify Student & Book Location Specs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Verify Details</span>
                          </button>
                          <button
                            onClick={() => onApproveRequest(req.id, currentApproveDate)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 select-none flex-1 sm:flex-none justify-center"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => onRejectRequest(req.id)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 select-none flex-1 sm:flex-none justify-center"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          {onHoldRequest && (
                            <button
                              onClick={() => onHoldRequest(req.id)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-805 font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 select-none flex-1 sm:flex-none justify-center"
                            >
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Hold</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {requests.filter(r => r.status === 'Pending').length === 0 && (
                  <p className="py-6 text-center text-slate-400 text-xs">{t.noPenRequests}</p>
                )}
              </div>
            </div>

            {/* Active Loans & Return checks list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1.5 select-none font-sans">
                📚 Issued Books List
              </h3>

              <div className="divide-y divide-slate-150">
                {paginatedLoans.map(loan => {
                  const outDemo = getStudentProfile(loan.rollNumber);
                  const isPastDue = isOverdue(loan.dueDate);
                  return (
                    <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs animate-fade-in">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{loan.studentName} (Roll #{loan.rollNumber})</span>
                          <span className="text-[10px] bg-slate-100 px-1 text-slate-600 font-bold font-sans">Class {outDemo.class}-{outDemo.section}</span>
                          <span className="text-[11px] text-slate-500 font-mono">[{loan.bookId}]</span>
                        </div>
                        <p className="text-slate-650 font-medium mt-1">Title: <b className="text-slate-805">{loan.bookName}</b></p>
                        <div className="flex gap-4 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono block">Issued date: {loan.issueDate}</span>
                          <span className={`text-[10px] font-mono font-bold block ${isPastDue ? 'text-red-500' : 'text-slate-400'}`}>
                            Due Date: {loan.dueDate} {isPastDue ? `(${getDaysOverdue(loan.dueDate)} Days Overdue!)` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onReturnBook(loan.id)}
                        className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-55 text-[10.5px] font-extrabold text-slate-705 rounded shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-center select-none"
                      >
                        <span>Check-In Book (Return)</span>
                      </button>
                    </div>
                  );
                })}

                {activeLoans.length === 0 && (
                  <p className="py-6 text-center text-slate-400 text-xs">0 active loans outstanding.</p>
                )}
              </div>

              {renderPagination(activeLoansPage, activeLoans.length, 15, setActiveLoansPage)}
            </div>

          </div>

          {/* Dedicated Desk Launchpad Card (4 cols) */}
          <div className="lg:col-span-4 self-start" id="direct-issue-form">
            <div className="bg-slate-900 border-2 border-slate-805 text-white rounded-2xl p-6 space-y-5 shadow-lg select-none relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              
              <div className="space-y-1.5 border-b border-slate-800 pb-4">
                <span className="text-amber-400 uppercase text-[9px] block font-extrabold font-mono tracking-wider">🟢 Active Circulation Counter</span>
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">
                  {currentLang === 'HI' ? "त्वरित पुस्तक वितरण काउंटर" : "Circulation Desk Counter"}
                </h4>
              </div>

              <div className="space-y-3 font-sans text-xs text-slate-305 leading-relaxed">
                <p>
                  {currentLang === 'HI' 
                    ? "यह विद्यालय का केंद्रीय वितरण काउंटर है जहाँ से विद्यार्थियों को सीधे भौतिक पुस्तकें जारी की जाती हैं। उपयुक्त फ़ॉन्ट आकार में विवरण देखने के लिए यहाँ क्लिक करें।" 
                    : "This central desk operates direct in-person checkouts for verified library books. Use this portal on the counter desk to:"}
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-400">
                  <li>{currentLang === 'HI' ? "दाखिला संख्या या रॉल नंबर जांचें" : "Match against Student Roster"}</li>
                  <li>{currentLang === 'HI' ? "बहु-पुस्तक (एक साथ कई पुस्तकें) आवंटन" : "Distribute multiple books at once"}</li>
                  <li>{currentLang === 'HI' ? "देवनागरी, हिंग्लिश और विशेष शेल्फ खोजें" : "Search in Hindi, Hinglish & Accession #"}</li>
                  <li>{currentLang === 'HI' ? "नियत वापसी कैलेंडर समायोजित करें" : "Direct return due-date validation"}</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 p-4 font-black rounded-xl cursor-pointer text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-amber-400/10 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                id="launch-full-circulation-desk"
              >
                <ArrowUpRight className="w-5 h-5 shrink-0 stroke-[3]" />
                <span>
                  {currentLang === 'HI' ? "वितरण डेस्क लॉन्च करें (Full Screen)" : "Open Full-Screen Circulation Desk"}
                </span>
              </button>
              
              <p className="text-[10px] text-slate-500 font-mono text-center">
                Recommended for Librarians 45+ for maximum visual size & clarity.
              </p>
            </div>
          </div>

        </div>
      )}


      {/* PRINTABLE REPORTS TAB PANEL */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in" id="librarian-reports-view">
          
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1 flex-wrap gap-1 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
               onClick={() => setActiveReport('inventory')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'inventory'
                    ? 'bg-slate-900 text-white font-extrabold'
                    : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300'
               }`}
            >
              📋 Catalog Inventory Report
            </button>
            <button
               onClick={() => setActiveReport('loans')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'loans'
                    ? 'bg-slate-900 text-white font-extrabold'
                    : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300'
               }`}
            >
              📖 Currently Issued
            </button>
            <button
               onClick={() => setActiveReport('overdue')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'overdue'
                    ? 'bg-red-800 text-white font-extrabold'
                    : 'text-red-700 hover:bg-red-50 hover:text-red-900'
               }`}
            >
              ⚠️ Overdue Books
            </button>
            <button
               onClick={() => setActiveReport('students')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'students'
                    ? 'bg-slate-900 text-white font-extrabold'
                    : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300'
               }`}
            >
              👥 Student Roster Register
            </button>
            <button
               onClick={() => setActiveReport('history')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'history'
                    ? 'bg-indigo-900 text-white font-extrabold'
                    : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300'
               }`}
            >
              📜 Borrowing History Trails
            </button>
            <button
               onClick={() => setActiveReport('frequent')}
               className={`px-4 py-2 text-xs font-bold transition-all rounded ${
                  activeReport === 'frequent'
                    ? 'bg-emerald-805 text-white font-extrabold'
                    : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300'
               }`}
            >
              📈 Top Issued Books
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
                
                <div className="overflow-x-auto border rounded-xl shadow-xs border-slate-200">
                  <table className="w-full text-[11px] text-left border-collapse min-w-[900px] bg-white dark:bg-slate-900">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-200 select-none uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 font-mono">Sr #</th>
                        <th className="py-3 px-3">Accession #</th>
                        <th className="py-3 px-3">Call #</th>
                        <th className="py-3 px-3">Book #</th>
                        <th className="py-3 px-3">Book Title</th>
                        <th className="py-3 px-3">Author</th>
                        <th className="py-3 px-3">Publisher</th>
                        <th className="py-3 px-3">Year</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3 text-right">In-Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {books.map(b => (
                        <tr key={b.bookId} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-amber-400">{b.bookId}</td>
                          <td className="py-2 px-3 font-mono font-bold">{b.accessionNumber || b.bookId}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{b.callNumber || "-"}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{b.bookNumber || "-"}</td>
                          <td className="py-2 px-3 font-extrabold text-slate-950 dark:text-white">{b.bookName}</td>
                          <td className="py-2 px-3 font-medium">{b.author}</td>
                          <td className="py-2 px-3 text-slate-500">{b.publisher}</td>
                          <td className="py-2 px-3 font-mono">{b.yearOfPublication || "-"}</td>
                          <td className="py-2 px-3">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{b.totalCopies}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{b.availableCopies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                      <th className="py-2.5 text-right font-bold">DOB (Date of Birth)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {students.map(s => (
                      <tr key={s.studentId || `${s.class}-${s.section}-${s.rollNumber}`}>
                        <td className="py-2 font-bold text-slate-950">{s.name}</td>
                        <td className="py-2 text-center">Grade {s.class || '10'}-{s.section || 'A'}</td>
                        <td className="py-2 font-mono">#{s.rollNumber}</td>
                        <td className="py-2 text-right font-mono">{s.dob}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">0 students registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab content 4: Overdue Books */}
            {activeReport === 'overdue' && (
              <div className="space-y-4 font-sans text-slate-900">
                <div className="flex items-center justify-between bg-red-50 text-red-900 border border-red-200 p-2 text-xs font-bold rounded select-none">
                  <span>Total Overdue Books Checked: {overdueLogs.length}</span>
                  <span>Bihar Standard Penal Term: 14 Days max</span>
                </div>

                <div className="overflow-x-auto border border-red-200 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-red-50 font-bold text-red-950 border-b border-red-250 select-none">
                        <th className="p-3">Borrower Student</th>
                        <th className="p-3 text-center">Class / Section</th>
                        <th className="p-3 text-center">Roll Call</th>
                        <th className="p-3">Book Title</th>
                        <th className="p-3 text-center">Due Return Date</th>
                        <th className="p-3 text-right">Penalty State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {overdueLogs.map(log => {
                        const daysPast = getDaysOverdue(log.dueDate);
                        return (
                          <tr key={log.id} className="hover:bg-red-50/20">
                            <td className="p-3 font-bold text-slate-950">{log.studentName}</td>
                            <td className="p-3 text-center">Grade {log.class || "10"}-{log.section || "A"}</td>
                            <td className="p-3 text-center font-mono font-bold">#{log.rollNumber}</td>
                            <td className="p-3 italic text-red-900 font-medium">{log.bookName}</td>
                            <td className="p-3 text-center font-mono font-bold text-red-750">{log.dueDate}</td>
                            <td className="p-3 text-right font-mono font-black text-red-700 animate-pulse">{daysPast} Days Overdue</td>
                          </tr>
                        );
                      })}
                      {overdueLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">Celebrate! 0 active books are overdue under current logs.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab content 5: Student & Book Borrowing History Trails */}
            {activeReport === 'history' && (
              <div className="space-y-4 font-sans text-slate-900">
                <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                  <span>Total Historic Logs Checked: {issueLogs.length} entries</span>
                  <span>Scope: Cumulative (Returns are not deleted)</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-200 select-none uppercase text-[9px] tracking-wider">
                        <th className="p-2.5">Borrower Student</th>
                        <th className="p-2.5 text-center font-mono">Roll Call</th>
                        <th className="p-2.5">Book Title</th>
                        <th className="p-2.5 text-center font-mono">Issue Date</th>
                        <th className="p-2.5 text-center font-mono">Return Date</th>
                        <th className="p-2.5 text-right">Status State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-800">
                      {issueLogs.map(log => {
                        const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold">{log.studentName}</td>
                            <td className="p-2.5 text-center font-mono font-medium">#{log.rollNumber}</td>
                            <td className="p-2.5 font-sans font-medium italic">{log.bookName}</td>
                            <td className="p-2.5 text-center font-mono">{log.issueDate}</td>
                            <td className={`p-2.5 text-center font-mono ${log.status === 'Returned' ? 'text-emerald-700 font-bold' : ''}`}>
                              {log.returnDate || "-"}
                            </td>
                            <td className="p-2.5 text-right select-none">
                              <span className={`text-[9.5px] px-2 py-0.5 rounded font-bold uppercase inline-block border ${
                                log.status === 'Returned'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isPastDue
                                  ? 'bg-red-50 text-red-800 border-red-200 font-extrabold animate-pulse'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {log.status === 'Returned' ? "Returned" : isPastDue ? "Overdue" : "Issued"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {issueLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">0 past or current borrowing trails mapped.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab content 6: Most Frequently Issued Books */}
            {activeReport === 'frequent' && (() => {
              const popularityMap: Record<string, number> = {};
              issueLogs.forEach(log => {
                popularityMap[log.bookName] = (popularityMap[log.bookName] || 0) + 1;
              });

              const popularityList = Object.entries(popularityMap)
                .map(([title, count]) => {
                  const matchedB = books.find(b => b.bookName.toLowerCase() === title.toLowerCase());
                  return {
                    title,
                    count,
                    author: matchedB ? matchedB.author : "Bihar Text Book Board",
                    category: matchedB ? matchedB.category : "General Curriculum",
                    accNo: matchedB ? (matchedB.accessionNumber || matchedB.bookId) : "-"
                  };
                })
                .sort((a, b) => b.count - a.count);

              return (
                <div className="space-y-4 font-sans text-slate-900">
                  <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                    <span>Rankings: Ordered by issued count (highest first)</span>
                    <span>Most Borrowed Title: {popularityList[0]?.title || "None yet"}</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-200 select-none uppercase text-[9px] tracking-wider">
                          <th className="p-3 text-center">Rank</th>
                          <th className="p-3">Accession Number</th>
                          <th className="p-3 max-w-[250px]">Book Title / Syllabus Unit</th>
                          <th className="p-3">Author</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Times Issued / आवृत्ति</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {popularityList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-black text-indigo-700">#{idx + 1}</td>
                            <td className="p-3 font-mono font-bold">{item.accNo}</td>
                            <td className="p-3 font-bold text-slate-950 max-w-[250px] truncate">{item.title}</td>
                            <td className="p-3 text-slate-550">{item.author}</td>
                            <td className="p-3">
                              <span className="bg-slate-100 text-slate-655 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-black text-emerald-700">{item.count} Times Issued</td>
                          </tr>
                        ))}
                        {popularityList.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">No books have been issued yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* MANUALLY REGISTER BOOK FORM MODAL */}
      {showBookForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {editingBook ? "Edit Register Book Entry" : "Manual Book register catalog enrollment"}
              </span>
              <button 
                onClick={() => { setShowBookForm(false); setEditingBook(null); }}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer font-bold"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookFormSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-indigo-900 uppercase block">Accession Number *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBook}
                    value={formAccessionNumber}
                    onChange={(e) => setFormAccessionNumber(e.target.value)}
                    placeholder="e.g. 5431/A (Must be unique)"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800 disabled:opacity-60 text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-indigo-900 uppercase block">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vigyan Class 10 Handbooks"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. NCERT Panel Board"
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800 text-slate-905"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Publisher *</label>
                  <input
                    type="text"
                    required
                    value={formPublisher}
                    onChange={(e) => setFormPublisher(e.target.value)}
                    placeholder="e.g. BSTBPC Patna press"
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800 text-slate-905"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Year of Publication</label>
                  <input
                    type="text"
                    value={formYearOfPublication}
                    onChange={(e) => setFormYearOfPublication(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Place of Publication</label>
                  <input
                    type="text"
                    value={formPlaceOfPublication}
                    onChange={(e) => setFormPlaceOfPublication(e.target.value)}
                    placeholder="e.g. Patna, India"
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Book Editor</label>
                  <input
                    type="text"
                    value={formEditor}
                    onChange={(e) => setFormEditor(e.target.value)}
                    placeholder="e.g. Dr. S. K. Sinha"
                    className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Edition</label>
                  <input
                    type="text"
                    value={formEdition}
                    onChange={(e) => setFormEdition(e.target.value)}
                    placeholder="e.g. 3rd Revised"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Volume</label>
                  <input
                    type="text"
                    value={formVolume}
                    onChange={(e) => setFormVolume(e.target.value)}
                    placeholder="e.g. Vol. II"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Pages</label>
                  <input
                    type="text"
                    value={formPages}
                    onChange={(e) => setFormPages(e.target.value)}
                    placeholder="e.g. 340 p."
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Price (INR)</label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 240.00"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none font-mono text-emerald-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-550 uppercase block">Call Number</label>
                  <input
                    type="text"
                    value={formCallNumber}
                    onChange={(e) => {
                      setFormCallNumber(e.target.value);
                      // Auto classify category dynamically based on Call Number
                      if (e.target.value) {
                        const numStr = String(e.target.value).trim().match(/\d+/);
                        if (numStr) {
                          const firstDigit = parseInt(numStr[0].slice(0, 1));
                          const ddcList = ["Generalities", "Philosophy", "Religion", "Social Sciences", "Language", "Science", "Technology", "Arts & Recreation", "Literature", "History & Geography"];
                          if (firstDigit >= 0 && firstDigit < 10) {
                            setFormCategory(ddcList[firstDigit]);
                          }
                        }
                      }
                    }}
                    placeholder="e.g. 510/NCERT"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none font-mono text-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Book Number</label>
                  <input
                    type="text"
                    value={formBookNumber}
                    onChange={(e) => setFormBookNumber(e.target.value)}
                    placeholder="e.g. B-012"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Procurement Source</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="e.g. Gov. Patna Grant"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-indigo-900 uppercase block">Dewey Decimal Classification (DDC) Number</label>
                  <input
                    type="text"
                    value={formDdcNumber}
                    onChange={(e) => handleDdcChange(e.target.value)}
                    placeholder="e.g., 510 or 370 (Auto-classifies category)"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none font-mono text-indigo-750 font-bold"
                  />
                  <span className="text-[9px] text-slate-500 font-sans block">Entering a DDC number dynamically determines the Dewey Category Class.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Inferred Category</label>
                  <div className="p-2 bg-white border border-slate-200 rounded text-xs font-black text-slate-800 font-sans">
                    {formCategory || "None Inferred"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Classification Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 block outline-none text-slate-900 font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Register copies count *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formCopies}
                    onChange={(e) => setFormCopies(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-bold font-mono text-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Librarian Office Remarks</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Received in fine catalog status bound."
                  className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Brief syllabus syllabus items description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Special chapter notes summaries or curriculum details..."
                  className="w-full text-xs p-2 rounded bg-white border border-slate-250 h-16 resize-none outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowBookForm(false); setEditingBook(null); }}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-55 text-xs font-bold text-slate-600 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs rounded cursor-pointer select-none tracking-wider"
                >
                  Commit Book to Register
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MANUALLY REGISTER/EDIT STUDENT FORM MODAL */}
      {showStudentForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-205 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {editingStudent ? "Modify Student enrollment" : "enroll new student manually"}
              </span>
              <button 
                onClick={() => { setShowStudentForm(false); setEditingStudent(null); }}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer font-bold"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={studName}
                  onChange={(e) => setStudName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Sharma"
                  className="w-full text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-250 outline-none focus:ring-1 focus:ring-slate-800 text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Class (Grade) *</label>
                  <select
                    value={studClass}
                    onChange={(e) => setStudClass(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-bold"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(cls => (
                      <option key={cls} value={cls}>Grade {cls}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Section *</label>
                  <select
                    value={studSection}
                    onChange={(e) => setStudSection(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-bold font-mono"
                  >
                    {["A", "B", "C", "D", "E"].map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Roll Number *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={studRoll}
                    onChange={(e) => setStudRoll(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Date of Birth (DOB) *</label>
                  <input
                    type="date"
                    required
                    value={studDOB}
                    onChange={(e) => setStudDOB(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Credentials reminder notice */}
              <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-150 space-y-1 text-center">
                <span className="text-[9px] font-extrabold text-indigo-750 uppercase tracking-widest block">Class Roster System</span>
                <p className="text-[11px] text-slate-705 leading-normal font-bold">
                  Students will securely log in using their Class, Section, Roll Number, and Date of Birth parameters.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-205">
                <button
                  type="button"
                  onClick={() => { setShowStudentForm(false); setEditingStudent(null); }}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded cursor-pointer select-none tracking-wider"
                >
                  {editingStudent ? "Save Changes" : "Create Student Account"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DATABASE INSPECTOR PANEL FOR REALTIME TRANSPARENCY & AUDITING */}
      {activeTab === 'database' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-xl space-y-6 shadow-xs animate-fade-in" id="database-inspector-tab-content">
          <div className="border-b border-slate-105 dark:border-slate-800 pb-3 flex justify-between items-start select-none">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600 shrink-0" />
                Live System Status & Log Panel
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Checking connection records and digital files for PM SHRI Ramdiri +2 High School library.
              </p>
            </div>
            
            <button
              onClick={fetchDbInspectorStats}
              disabled={dbInspectorLoading}
              className="px-3 py-1.5 border border-slate-200 text-slate-705 bg-white hover:bg-slate-50 text-xs font-bold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbInspectorLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* DYNAMIC TIMEOUT / CONNECTION STATES INFO CARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50/50 dark:bg-slate-950 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Active Storage Mode</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dbInspectorStats?.mongoConnected ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`} />
                <span className="text-xs font-extrabold text-slate-900 dark:text-wrap dark:text-slate-200">
                  {dbInspectorStats?.mongoConnected ? "MongoDB Atlas Stack" : "JSON Local System Store"}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-500">
                {dbInspectorStats?.mongoConnected 
                  ? "Durable enterprise database hosting system." 
                  : "High-reliability sandbox memory store mode."}
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50/50 dark:bg-slate-950 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Last Sheet Import Date</span>
              <p className="text-xs font-extrabold text-indigo-800 dark:text-indigo-400 mt-1">
                {dbInspectorStats?.lastImportDate || "Never"}
              </p>
              <p className="text-[9.5px] text-slate-400">Time of last uploaded Excel file ingestion.</p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50/50 dark:bg-slate-950 space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Last Loaded Import Size</span>
              <p className="text-xs font-extrabold text-emerald-800 mt-1">
                {dbInspectorStats?.lastImportSize ? `${dbInspectorStats.lastImportSize} Records` : "0 Records"}
              </p>
              <p className="text-[9.5px] text-slate-400">Total ledger entries mapped in previous batch.</p>
            </div>
          </div>

          {/* DYNAMIC COLLECTIONS MAPPED COUNTERS METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-100 dark:bg-slate-950 p-4.5 rounded-xl text-center select-none">
            <div className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Books Collection</span>
              <span className="text-lg font-black text-slate-850 dark:text-slate-200 mt-1 block">{dbInspectorStats?.booksCount ?? books.length}</span>
            </div>
            <div className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Students Roster</span>
              <span className="text-lg font-black text-slate-850 dark:text-slate-200 mt-1 block">{dbInspectorStats?.studentsCount ?? students.length}</span>
            </div>
            <div className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Issue Checkout Logs</span>
              <span className="text-lg font-black text-slate-850 dark:text-slate-200 mt-1 block">{dbInspectorStats?.issueLogsCount ?? issueLogs.length}</span>
            </div>
            <div className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Borrow Requests</span>
              <span className="text-lg font-black text-slate-850 dark:text-slate-200 mt-1 block">{dbInspectorStats?.requestsCount ?? requests.length}</span>
            </div>
          </div>

          {/* LIVE RECORD VIEWER - CHOOSE COLLECTION TO INSPECT */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Live Server Record Inspector
              </h4>
              
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setInspectorPreviewColl('books')}
                  className={`px-3 py-1 rounded text-[10.5px] font-extrabold cursor-pointer ${
                    inspectorPreviewColl === 'books' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-150 text-slate-650'
                  }`}
                >
                  Books Collection Preview ({dbInspectorStats?.booksCount ?? books.length})
                </button>
                <button
                  onClick={() => setInspectorPreviewColl('students')}
                  className={`px-3 py-1 rounded text-[10.5px] font-extrabold cursor-pointer ${
                    inspectorPreviewColl === 'students' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-150 text-slate-650'
                  }`}
                >
                  Students Collection Preview ({dbInspectorStats?.studentsCount ?? students.length})
                </button>
              </div>
            </div>

            <div className="border border-slate-250 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-950 text-slate-300 font-mono text-[10.5px] p-4 max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center text-slate-500 mb-3 border-b border-slate-800 pb-1.5 text-[9.5px]">
                <span>COLLECTION: <b className="text-emerald-450 uppercase">{inspectorPreviewColl}</b></span>
                <span>STATUS: REALTIME DATA SYNC RECOVERED</span>
              </div>

              {inspectorPreviewColl === 'books' ? (
                <div className="space-y-3">
                  {books.slice(0, 5).map((bk, i) => (
                    <div key={i} className="p-2.5 bg-slate-900 rounded border border-slate-800 hover:bg-slate-900/80 transition-all font-mono">
                      <span className="text-emerald-500 font-bold block mb-1">Mongoose document index [{i + 1}]</span>
                      <pre className="text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{JSON.stringify({
                        _id: `ObjectId("acc_hex_${bk.bookId.toLowerCase().replace(/[^a-f0-9]/g, '0').slice(-8)}")`,
                        bookId: bk.bookId,
                        bookName: bk.bookName,
                        author: bk.author,
                        publisher: bk.publisher,
                        category: bk.category,
                        totalCopies: bk.totalCopies,
                        availableCopies: bk.availableCopies,
                        description: bk.description ? bk.description.slice(0, 100) + (bk.description.length > 100 ? "..." : "") : ""
                      }, null, 2)}</pre>
                    </div>
                  ))}
                  {books.length === 0 && (
                    <p className="text-slate-500 italic text-center py-4 font-sans">No books saved in active collection store. Please import an Excel sheet.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {students.slice(0, 5).map((st, i) => (
                    <div key={i} className="p-2.5 bg-slate-900 rounded border border-slate-800 hover:bg-slate-900/80 transition-all font-mono">
                      <span className="text-emerald-500 font-bold block mb-1">Mongoose document index [{i + 1}]</span>
                      <pre className="text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{JSON.stringify({
                        _id: `ObjectId("stud_hex_${st.rollNumber}")`,
                        name: st.name,
                        rollNumber: st.rollNumber,
                        dob: st.dob,
                        class: st.class,
                        section: st.section
                      }, null, 2)}</pre>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-slate-500 italic text-center py-4 font-sans">No students saved in active collection store. Please import a students XLSX sheet.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DATABASE TOOLS CARD (BACKUP, RESTORE, SEEDING FACTORY RESET) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50 dark:bg-slate-950/40 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                Database Backup, Restore & Resilience Utilities
              </h4>
              <p className="text-[11px] text-slate-505 mt-1">
                Perform full system backups, restore from JSON files, and seed or reset database states.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Backups Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Full System Backup</span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Download complete snapshot containing books, students, pending borrow requests, and historical logs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBackupDatabase}
                  className="w-full px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON Backup File</span>
                </button>
              </div>

              {/* Restore Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Restore from Backup Snapshot</span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Upload a previously exported system JSON backup file to overwrite current database state.
                  </p>
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".json"
                    id="db-restore-file-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        try {
                          const payload = JSON.parse(evt.target?.result as string);
                          setConfirmModal({
                            type: 'restore-database',
                            title: 'Restore Database Backup',
                            message: 'WARNING: Are you sure you want to restore this backup file? This will completely OVERWRITE all current bookstore inventory, student records, and borrow registers!',
                            confirmLabel: 'Restore and Overwrite',
                            targetId: JSON.stringify(payload)
                          });
                        } catch (err) {
                          alert("Error: Invalid JSON backup file format.");
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = ''; // clear
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('db-restore-file-input')?.click()}
                    className="w-full px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JSON Backup file</span>
                  </button>
                </div>
              </div>

              {/* CSV Books Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-500 font-mono tracking-wider block">Books Registry (CSV)</span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Export currently registered books to CSV file or import/upload books from a CSV file.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ["Book ID", "Title", "Author", "Publisher", "Category", "Accession Number", "Total Copies", "Available Copies", "Call Number", "Book Number", "DDC Code"];
                      const keys = ["bookId", "bookName", "author", "publisher", "category", "accessionNumber", "totalCopies", "availableCopies", "callNumber", "bookNumber", "ddcCategory"];
                      exportToCSV(books, "ramdiri_books_export.csv", headers, keys);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-850 dark:text-slate-200 hover:dark:bg-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Export Books CSV</span>
                  </button>

                  <input
                    type="file"
                    accept=".csv"
                    id="books-csv-import-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const text = evt.target?.result as string;
                          const grid = parseCSV(text);
                          if (grid.length < 2) {
                            alert("Error: Empty or invalid CSV file.");
                            return;
                          }
                          grid.shift(); // remove header
                          const importedBooks: Book[] = grid
                            .filter(row => row.length >= 5 && row[0] && row[1])
                            .map(row => ({
                              bookId: row[0] || `${Date.now()}-${Math.random()}`,
                              bookName: row[1] || "Untitled Book",
                              author: row[2] || "Unknown",
                              publisher: row[3] || "N/A",
                              category: row[4] || "General",
                              accessionNumber: row[5] || "",
                              totalCopies: parseInt(row[6]) || 1,
                              availableCopies: parseInt(row[7]) || 1,
                              callNumber: row[8] || "",
                              bookNumber: row[9] || "",
                              ddcCategory: row[10] || "",
                              description: "",
                              coverImage: ""
                            }));

                          if (importedBooks.length === 0) {
                            alert("No valid book records could be recognized under CSV header specifications.");
                            return;
                          }

                          if (confirm(`Attempting to upload ${importedBooks.length} book records from CSV. Continue?`)) {
                            onImportBooksExcel(importedBooks);
                          }
                        } catch (err: any) {
                          alert(`CSV Parse Error: ${err.message || err}`);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('books-csv-import-input')?.click()}
                    className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-850 dark:text-slate-200 hover:dark:bg-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Import Books CSV</span>
                  </button>
                </div>
              </div>

              {/* CSV Students Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-500 font-mono tracking-wider block">Students Roster (CSV)</span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Export student logins to CSV file or import/add student logins from a CSV file.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ["Student ID", "Name", "Roll Number", "DOB (YYYY-MM-DD)", "Class", "Section"];
                      const keys = ["studentId", "name", "rollNumber", "dob", "class", "section"];
                      exportToCSV(students, "ramdiri_students_export.csv", headers, keys);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-850 dark:text-slate-200 hover:dark:bg-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Export Students CSV</span>
                  </button>

                  <input
                    type="file"
                    accept=".csv"
                    id="students-csv-import-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const text = evt.target?.result as string;
                          const grid = parseCSV(text);
                          if (grid.length < 2) {
                            alert("Error: Empty or invalid CSV file.");
                            return;
                          }
                          grid.shift(); // remove header
                          const importedStudents: Student[] = grid
                            .filter(row => row.length >= 5 && row[1] && row[2])
                            .map(row => ({
                              studentId: row[0] || `${row[4] || "10"}-${(row[5] || "A").toUpperCase()}-${row[2]}`,
                              name: row[1] || "Student Reader",
                              rollNumber: parseInt(row[2]) || 1,
                              dob: row[3] || "2010-01-01",
                              class: row[4] || "10",
                              section: (row[5] || "A").toUpperCase()
                            }));

                          if (importedStudents.length === 0) {
                            alert("No valid student records recognized under specified CSV headers mapping.");
                            return;
                          }

                          if (confirm(`Attempting to import ${importedStudents.length} students from CSV. Continue?`)) {
                            onImportStudentsExcel(importedStudents);
                          }
                        } catch (err: any) {
                          alert(`CSV Parse Error: ${err.message || err}`);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('students-csv-import-input')?.click()}
                    className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-850 dark:text-slate-200 hover:dark:bg-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Import Students CSV</span>
                  </button>
                </div>
              </div>

              {/* Seeding Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-red-550 font-mono tracking-wider block">Factory Reseed & Clear</span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Wipe current records and reseed the system with Bihar Government standard education templates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      type: 'reset-database',
                      title: 'Factory Default Reset',
                      message: "CRITICAL WARNING: This resets everything to government factory default samples. All manual entries will be erased. Please type 'RESET' to authorize the factory reset:",
                      confirmLabel: 'Execute Factory Reset',
                      requireInput: 'RESET'
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-400 text-red-700 font-extrabold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-650" />
                  <span>Reseed / Factory Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* DURABLE SYSTEM AUDIT TRAIL LOG */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/50 space-y-4 shadow-sm animate-fade-in" id="audit-trail-panel">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                  Durable System Audit Trail Ledger / सिस्टम ऑडिट लॉग
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Permanent operational trail tracking registrations, issues/returns, and inventory management.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportAuditLogs}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded shadow-xs flex items-center gap-1.5 hover:shadow transition-all cursor-pointer select-none"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT AUDIT LOGS (CSV)</span>
                </button>
                {onRefreshInputLogs && (
                  <button
                    type="button"
                    onClick={onRefreshInputLogs}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer select-none"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-550 animate-pulse" />
                    <span>SYNC TRAILS</span>
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH AND FILTERING SYSTEM CONTROLS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950 p-4.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block">Search Audit Ledger / खोजें</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Search logs by keyword, authorized operator, student name or ID..."
                    className="w-full text-xs text-slate-950 dark:text-slate-100 pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-1 focus:ring-slate-800 outline-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block">Filter Action Type / प्रकार</label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full text-xs text-slate-950 dark:text-slate-100 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:ring-1 focus:ring-slate-800 outline-none font-bold"
                >
                  <option value="ALL">All Actions (सभी गतिविधिया)</option>
                  <option value="Book Issued">Book Issued (पुस्तक जारी की गई)</option>
                  <option value="Book Returned">Book Returned (पुस्तक वापस की गई)</option>
                  <option value="Book Added">Book Added (नई पुस्तक जोड़ी गई)</option>
                  <option value="Book Edited">Book Edited (पुस्तक संपादित)</option>
                  <option value="Book Deleted">Book Deleted (पुस्तक हटा दी गई)</option>
                  <option value="Student Added">Student Added (नया छात्र जोड़ा गया)</option>
                  <option value="Student Edited">Student Edited (छात्र रिकॉर्ड अद्यतन)</option>
                  <option value="Student Deleted">Student Deleted (छात्र रिकॉर्ड हटाया)</option>
                </select>
              </div>
            </div>

            {/* AUDIT LOG TABLE LAYOUT */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800 select-none">
                    <tr>
                      <th className="p-3">Timestamp / समय</th>
                      <th className="p-3">Authorized Operator</th>
                      <th className="p-3">Action Type</th>
                      <th className="p-3">Activity Description & Records Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-150 dark:border-slate-800 hover:bg-slate-50/55 dark:hover:bg-slate-850/40 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-555 shrink-0" />
                          <span>{log.user}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap ${
                            log.action.includes('Issued') ? 'bg-amber-100 text-amber-805 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400' :
                            log.action.includes('Returned') ? 'bg-emerald-100 text-emerald-805 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            log.action.includes('Added') ? 'bg-blue-100 text-blue-805 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-400' :
                            log.action.includes('Edited') ? 'bg-indigo-100 text-indigo-805 border border-indigo-350 dark:bg-indigo-950/40 dark:text-indigo-400' :
                            'bg-red-50 text-red-805 border border-red-300 dark:bg-red-950/45 dark:text-red-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-850 dark:text-slate-150 font-bold leading-normal">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {filteredAuditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 italic font-sans bg-slate-50/50">
                          No official system audit logs matched these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* DIGITAL STUDY NOTES MANAGEMENT PANEL */}
      {activeTab === 'study-materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="study-materials-librarian-tab">
          
          {/* Form publish section */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 self-start">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                📢 Publish Course Material
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Upload digital syllabi, questions banks, and PDFs instantly accessible to authorized grade levels.
              </p>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-indigo-900 uppercase block">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="e.g. Class 10 Math Sample Board Papers 2026"
                  className="w-full text-xs p-2.5 rounded bg-slate-50 border border-slate-250 outline-none text-slate-900 font-bold focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Description & syllabus indices</label>
                <textarea
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  placeholder="Summarize chapter inclusions or instructions..."
                  className="w-full text-xs p-2.5 rounded bg-slate-50 border border-slate-250 outline-none min-h-[70px] resize-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-550 block">Target Grade / Class</label>
                  <select
                    value={matVisibleTo}
                    onChange={(e) => setMatVisibleTo(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-250 rounded block outline-none font-bold text-slate-900"
                  >
                    <option value="All">All Grades (Universal)</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-550 block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={matExpiryDate}
                    onChange={(e) => setMatExpiryDate(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-slate-250 rounded block outline-none text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* High-craft Drag-and-Drop or Picker Area for PDF */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Digital Document File (PDF) *</label>
                
                {!pdfBase64 ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-slate-50 transition-all relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-600 block">Drag-and-Drop or click to choose PDF</span>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">Maximum size 5MB</span>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-650" />
                      </div>
                      <div className="overflow-hidden max-w-[200px]">
                        <span className="text-xs font-bold text-indigo-950 block truncate font-mono">{pdfFileName}</span>
                        <span className="text-[9px] text-indigo-500 font-mono">Ready to Upload</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPdfBase64(''); setPdfFileName(''); }}
                      className="w-6 h-6 rounded-full bg-indigo-200 hover:bg-indigo-300 text-indigo-950 flex items-center justify-center text-xs transition-all cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingMaterial || uploadingPdf}
                className="w-full p-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-955 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow flex items-center justify-center gap-2"
              >
                {submittingMaterial ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish Resource Notes</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active materials list section */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  📂 Published Digital Resources Catalog
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing active syllabi references synchronized for students online.
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black uppercase">
                {studyMaterials.length} Active Items
              </span>
            </div>

            <div className="divide-y divide-slate-150 max-h-[600px] overflow-y-auto pr-1">
              {studyMaterials.map((mat) => (
                <div key={mat.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] bg-indigo-50 text-indigo-850 px-2 py-0.5 rounded font-extrabold uppercase border border-indigo-100">
                        Class {mat.visibleTo}
                      </span>
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        📝 {mat.title}
                      </h4>
                    </div>
                    {mat.description && (
                      <p className="text-[11px] text-slate-550 line-clamp-2 leading-relaxed">
                        {mat.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-[10px] text-slate-450 font-mono pt-1">
                      <span>Published: {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : ""}</span>
                      <span className="text-red-500 font-bold">Expires: {mat.expiryDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:sm:self-center shrink-0">
                    {mat.pdfData && (
                      <>
                        <button
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`<iframe src="${mat.pdfData}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
                            } else {
                              alert("Popup blocked! Please use the download button next to this button instead.");
                            }
                          }}
                          className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-705 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer"
                          title="Preview PDF document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const linkSource = mat.pdfData;
                              const downloadLink = document.createElement("a");
                              const fileName = mat.pdfName || `${mat.title.replace(/\s+/g, '_')}.pdf`;
                              downloadLink.href = linkSource;
                              downloadLink.download = fileName;
                              downloadLink.click();
                            } catch (e) {
                              alert("Error initiating PDF download.");
                            }
                          }}
                          className="p-1.5 border border-slate-200 hover:bg-slate-50 text-indigo-650 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer"
                          title="Download PDF document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete the published digital resource "${mat.title}"?`)) {
                          if (onDeleteStudyMaterial) {
                            const success = await onDeleteStudyMaterial(mat.id);
                            if (success) {
                              alert("Digital study material successfully deleted.");
                            }
                          }
                        }
                      }}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-655 rounded border border-red-100 flex items-center justify-center transition-all cursor-pointer"
                      title="Delete publication"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {studyMaterials.length === 0 && (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-xs">No digital study notes or resource publications published yet.</p>
                </div>
              )}
            </div>

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
                Chief Librarian Display Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter full librarian display name"
                className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
              />
              <span className="text-[10px] text-slate-400 block font-sans select-none">Displayed on top level headers, printable files, and certification badges.</span>
            </div>

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
                className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
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
                  className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 pr-10 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 chars (Leave blank to keep)"
                    className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 pr-10 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
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

            {successReportName && (
              <div className="p-4 bg-indigo-55 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-950 rounded-xl space-y-2 animate-fade-in text-xs shadow-inner">
                <div className="flex items-center gap-1.5 font-black text-indigo-950 dark:text-indigo-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>⚙️ SYSTEM PERSISTENCE STATUS REPORT:</span>
                </div>
                <div className="flex items-center gap-3 font-mono bg-white dark:bg-slate-950 p-2 rounded border border-indigo-100 dark:border-indigo-900">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Previous Name</span>
                    <span className="text-slate-500 line-through truncate block text-[11px] font-bold">{successReportName.prev}</span>
                  </div>
                  <span className="text-slate-400 font-bold shrink-0">→</span>
                  <div>
                    <span className="text-[9px] text-emerald-500 block uppercase font-bold text-emerald-600 dark:text-emerald-400">New Name</span>
                    <span className="text-emerald-800 dark:text-emerald-400 truncate block text-[11.5px] font-black">{successReportName.curr}</span>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-650 dark:text-indigo-400 italic">✓ Display updated in global Header, Navigation Sidebar, and Administrative Roster Register.</p>
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
                  <div className="md:col-span-12 lg:col-span-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4.5 rounded-xl space-y-3">
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
                        textColor: "text-blue-700 dark:text-blue-400"
                      },
                      {
                        label: currentLang === 'HI' ? "कुल जारी" : "Issued Ledger",
                        val: totalIssuedValue,
                        bgColor: "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-950",
                        textColor: "text-indigo-700 dark:text-indigo-400"
                      },
                      {
                        label: currentLang === 'HI' ? "कुल लौटाया" : "Total Returned",
                        val: totalReturnedValue,
                        bgColor: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-950",
                        textColor: "text-emerald-700 dark:text-emerald-450"
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
                          <th className="p-3">Book Title / Syllabus Unit</th>
                          <th className="p-3 font-mono text-center">Serial #</th>
                          <th className="p-3 font-mono text-center">Acc #</th>
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
                          const bookAccNo = matchedB ? (matchedB.accessionNumber || matchedB.bookId) : "-";

                          return (
                            <tr key={lidx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20 font-mono text-slate-850 dark:text-slate-200">
                              <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{log.bookName}</td>
                              <td className="p-3 text-center font-mono font-black text-indigo-700 dark:text-amber-400">#{log.bookId}</td>
                              <td className="p-3 text-center font-mono font-bold text-slate-805 dark:text-slate-300">{bookAccNo}</td>
                              <td className="p-3 font-sans text-slate-505 dark:text-slate-400 text-xs">{bookAuthorStr}</td>
                              <td className="p-3 text-center">{log.issueDate}</td>
                              <td className="p-3 text-center font-bold">{log.dueDate}</td>
                              <td className="p-3 text-center text-emerald-700 dark:text-emerald-450 font-black">{log.returnDate || "-"}</td>
                              <td className="p-3 text-right">
                                <span className={`text-[10px] px-2.5 py-1 rounded font-sans font-black uppercase inline-block border ${
                                  logStatus === 'Returned'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-150 dark:bg-emerald-950/20 dark:border-emerald-950'
                                    : logStatus === 'Overdue'
                                    ? 'bg-red-50 text-red-800 border-red-200 text-red-750 font-black animate-pulse dark:bg-red-950/20 dark:border-red-900'
                                    : 'bg-amber-50 text-amber-805 border-amber-150 dark:bg-amber-950/20 dark:border-amber-950'
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
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">No physical book issues in student's academic history ledger.</td>
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
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded shadow transition-all cursor-pointer select-none font-sans"
                >
                  Close Student History Register
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 4. BOOK DETAIL & HISTORIC LOGS AUDIT TRAIL MODAL */}
      {selectedProfileBook && (() => {
        const bk = selectedProfileBook;
        const bookLogs = issueLogs.filter(l => l.bookId === bk.bookId);
        const activeLoansForBook = bookLogs.filter(l => l.status === 'Issued');
        const timesIssued = bookLogs.length;
        
        let currentStatus = "Available";
        if (bk.availableCopies === 0) {
          currentStatus = "All Copies Checked Out";
        } else if (bk.availableCopies < bk.totalCopies) {
          currentStatus = "Partially Checked Out";
        }

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in" id="book-profile-details-modal">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col text-slate-900 dark:text-slate-100">
              
              {/* Modal Header */}
              <div className="bg-slate-950 text-white p-5 flex items-center justify-between" style={{ backgroundColor: '#111827' }}>
                <div className="space-y-0.5">
                  <span className="font-bold text-[10px] uppercase tracking-widest block text-indigo-400 font-mono">★★ PM SHRI RAMDIRI +2 HIGH SCHOOL ★★</span>
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{currentLang === 'HI' ? "पुस्तक का इतिहास एवं ऑडिट ट्रेल" : "Book History & Audit Trail"}</span>
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedProfileBook(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-200 hover:text-white transition-all cursor-pointer font-bold select-none"
                  title="Close Modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Container */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                {/* 1. Book Details Grid & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Left Specs Information Block */}
                  <div className="md:col-span-12 lg:col-span-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-3 shadow-sm">
                    <div className="flex gap-4">
                      <div className="w-16 shrink-0 select-none">
                        <GoogleBookCover bookName={bk.bookName} author={bk.author} coverImage={bk.coverImage} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-2.0 py-0.5 rounded font-black uppercase inline-block font-mono">
                          {bk.category}
                        </span>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base mt-1 leading-tight">
                          {bk.bookName}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">by {bk.author}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Book Name:</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right">{bk.bookName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Serial Number:</span>
                        <span className="font-mono font-bold text-indigo-750 dark:text-indigo-400 text-right">#{bk.bookId}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Shelf Serial Number:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">#{categorySerialsMap.get(bk.bookId) || 1}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Accession Number:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-right">{bk.accessionNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Call Number:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-right">{bk.callNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Book Number:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-right">{bk.bookNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Publisher:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{bk.publisher || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-500 font-bold font-sans">Category:</span>
                        <span className="px-2 py-0.5 bg-slate-150 rounded text-[10px] font-bold text-slate-800 text-right">{bk.category}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-bold font-sans">Current Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-right ${bk.availableCopies > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-805'}`}>
                          {bk.availableCopies > 0 ? 'Available' : 'Checked Out'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Statistics Box */}
                  <div className="md:col-span-12 lg:col-span-6 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Total Times Issued</span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-400 mt-2">{timesIssued} times</span>
                      </div>
                      <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Total Times Returned</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2">{bookLogs.filter(log => log.status === 'Returned').length} times</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Stock Availability</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                          <b className="text-slate-900 dark:text-white font-mono text-sm">{bk.availableCopies} available</b> / {bk.totalCopies} total
                        </span>
                      </div>
                      <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Current Status Code</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2 font-mono uppercase">{currentStatus}</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block select-none">Current Holder(s)</span>
                      <div className="flex flex-wrap gap-2 animate-fade-in">
                        {activeLoansForBook.map((loan, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-sans font-bold text-xs shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span>{loan.studentName} (Class {loan.class || "10"}-{loan.section || "A"} / Roll #{loan.rollNumber})</span>
                          </div>
                        ))}
                        {activeLoansForBook.length === 0 && (
                          <p className="text-xs text-slate-500 italic block">None (Available in stock, no active holders)</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* 2. Historic Logs Table */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">📜 Permanent History Table</span>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 uppercase text-slate-555 font-bold text-[9px] border-b border-slate-150 dark:border-slate-800 select-none font-mono">
                          <th className="p-3">Student Name</th>
                          <th className="p-3 text-center">Class</th>
                          <th className="p-3 text-center">Section</th>
                          <th className="p-3 text-center">Roll Number</th>
                          <th className="p-3 text-center">Issue Date</th>
                          <th className="p-3 text-center">Issue Time</th>
                          <th className="p-3 text-center font-mono">Due Date</th>
                          <th className="p-3 text-center font-mono">Return Date</th>
                          <th className="p-3 text-center font-mono">Return Time</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bookLogs.map((log, lidx) => {
                          const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
                          return (
                            <tr key={lidx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20 font-mono text-slate-850 dark:text-slate-200">
                              <td className="p-3 font-sans font-extrabold flex items-center gap-1.5 font-extrabold">
                                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{log.studentName}</span>
                              </td>
                              <td className="p-3 text-center font-sans font-bold">{log.class || "10"}</td>
                              <td className="p-3 text-center font-sans font-bold">{log.section || "A"}</td>
                              <td className="p-3 text-center">#{log.rollNumber}</td>
                              <td className="p-3 text-center">{log.issueDate}</td>
                              <td className="p-3 text-center text-slate-500 dark:text-slate-400">{log.issueTime || "10:32 AM"}</td>
                              <td className="p-3 text-center font-bold">{log.dueDate}</td>
                              <td className="p-3 text-center text-emerald-700 dark:text-emerald-450 font-black">{log.returnDate || "-"}</td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">{log.returnTime || (log.returnDate ? "11:04 AM" : "-")}</td>
                              <td className="p-3 text-right font-sans">
                                <span className={`text-[10px] px-2.5 py-1 rounded font-black uppercase inline-block border ${
                                  log.status === 'Returned'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-150 dark:bg-emerald-950/20 dark:border-emerald-950'
                                    : isPastDue
                                    ? 'bg-red-50 text-red-800 border-red-200 text-red-750 font-black animate-pulse dark:bg-red-950/20 dark:border-red-900'
                                    : 'bg-amber-50 text-amber-805 border-amber-150 dark:bg-amber-950/20 dark:border-amber-950'
                                }`}>
                                  {log.status === 'Returned' 
                                    ? (currentLang === 'HI' ? "जमा किया" : "Returned") 
                                    : isPastDue 
                                    ? (currentLang === 'HI' ? "विलंबित" : "Overdue") 
                                    : (currentLang === 'HI' ? "सक्रिय जारी" : "Issued")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {bookLogs.length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400 font-sans">No borrowing instances mapped in catalog registers for this book.</td>
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
                  onClick={() => setSelectedProfileBook(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-855 text-white font-extrabold text-xs rounded shadow transition-all cursor-pointer select-none"
                >
                  Close Book History Register
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* FULL-SCREEN DEDICATED CIRCULATION DESK MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs z-50 flex flex-col overflow-y-auto animate-fade-in p-2 sm:p-5 text-slate-900 dark:text-slate-100" id="full-screen-circulation-desk">
          <div className="bg-slate-50 dark:bg-slate-950 w-full rounded-2xl shadow-2xl flex flex-col overflow-hidden max-w-7xl mx-auto border-2 border-slate-705 dark:border-slate-800 min-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 shrink-0 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-400 text-slate-950 text-[10px] font-black uppercase rounded tracking-wider">Circulation Desk v2.0</span>
                  <span className="text-slate-400 font-mono text-[11px]">System: Walk-In Issue Ledger</span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <span>🏫 Direct Desk Circulation Panel</span>
                  <span className="text-slate-400 text-sm font-normal"> / </span>
                  <span className="text-slate-300 font-bold font-sans text-sm">त्वरित पुस्तक वितरण नियंत्रण</span>
                </h2>
              </div>
              
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-5 py-3 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-md select-none self-end md:self-auto"
              >
                <XCircle className="w-4 h-4" />
                <span>Exit Desk (बंद करें)</span>
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto grid grid-cols-1 xl:grid-cols-12 gap-8 bg-slate-100 dark:bg-slate-900">
              
              {/* STEP 1: STUDENT SELECTION RAMP (col-span-4) */}
              <div className="xl:col-span-4 space-y-5 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                    <span className="text-amber-650 dark:text-amber-400 font-extrabold text-[10px] uppercase font-mono tracking-widest block">STEP 1 / चरण १</span>
                    <h3 className="text-base font-black text-slate-850 dark:text-white uppercase">
                      Identify Student (छात्र की पहचान)
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                      A. Select Class / Section (वर्ग और अनुभाग)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={walkinClass}
                          onChange={(e) => setWalkinClass(e.target.value)}
                          className="w-full text-xs font-black p-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-707 text-slate-900 dark:text-white rounded-xl outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                            <option key={c} value={String(c)}>Class {c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={walkinSection}
                          onChange={(e) => setWalkinSection(e.target.value)}
                          className="w-full text-xs font-black p-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-707 text-slate-900 dark:text-white rounded-xl outline-none"
                        >
                          {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                            <option key={s} value={s}>Section {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-605 dark:text-slate-400 block">
                      B. Student Roll Number (रोल नंबर दर्ज करें)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter roll, e.g. 14"
                      required
                      value={walkinRoll}
                      onChange={(e) => setWalkinRoll(e.target.value)}
                      className="w-full text-sm font-black p-3 bg-white dark:bg-slate-900 border-2 border-slate-400 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none"
                    />
                  </div>

                  {/* Verification Result Area */}
                  <div className="pt-3">
                    {matchedWalkinStudent ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-xl p-4 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-black text-xs">
                          <CheckCircle className="w-4 h-4" />
                          <span>🟢 REGISTER VERIFIED / दाखिला सत्यापित</span>
                        </div>
                        
                        <div className="text-slate-900 dark:text-white font-black text-base">
                          {matchedWalkinStudent.name}
                        </div>
                        
                        <div className="text-[11px] font-bold text-slate-500 uppercase font-sans">
                          Class {matchedWalkinStudent.class} • Section {matchedWalkinStudent.section} • Roll #{matchedWalkinStudent.rollNumber}
                        </div>

                        <div className="border-t border-emerald-200 dark:border-emerald-900 pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                          <span>Outstanding Loans:</span>
                          <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-205 px-2 py-0.5 rounded-full">
                            {issueLogs.filter(log => log.rollNumber === matchedWalkinStudent.rollNumber && log.status === 'Issued').length} Active
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500 text-xs italic space-y-1 py-10">
                        <p>Waiting for verified student matching...</p>
                        <p className="text-[10px] font-mono">Fill Section and Roll Number correctly to verify roster enrollment.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl text-[11px] text-slate-550 border border-slate-200 dark:border-slate-850 mt-4 leading-relaxed font-semibold">
                  📢 <b>Librarian Instruction Notice:</b> We look up live student profiles dynamically as you update the selectors details. Double check full name matches physical ID!
                </div>
              </div>

              {/* STEP 2: SHELF SEARCH & SELECTION WORKSPACE */}
              <div className="xl:col-span-5 space-y-4 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-201 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="space-y-4 flex-1 flex flex-col">
                  
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                    <span className="text-amber-655 dark:text-amber-400 font-extrabold text-[10px] uppercase font-mono tracking-widest block">STEP 2 / चरण २</span>
                    <h3 className="text-base font-black text-slate-850 dark:text-white uppercase">
                      Select Books (पुस्तकों का चयन)
                    </h3>
                  </div>

                  {/* Powerful Search Bar */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block pb-1">
                      Search catalog directly (खोज और फ़िल्टर)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type book name, author, Hinglish, accession number..."
                        value={walkinBookSearchQuery}
                        onChange={(e) => setWalkinBookSearchQuery(e.target.value)}
                        className="w-full text-xs font-bold p-3.5 pr-10 bg-white dark:bg-slate-900 border-2 border-slate-400 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none"
                      />
                      <Search className="w-5 h-5 text-slate-505 absolute right-3 top-3.5" />
                    </div>
                  </div>

                  {/* Results Window */}
                  <div className="flex-1 min-h-[180px] max-h-[280px] overflow-y-auto border-2 border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-900 bg-slate-55 dark:bg-slate-905">
                    {(() => {
                      const listToSearch = walkinBookSearchQuery.trim()
                        ? filteredWalkinBooks
                        : [...books]
                            .filter(b => b.availableCopies > 0)
                            .sort((a, b) => {
                              const idA = parseInt(a.bookId.replace(/\D/g, ''), 10) || 0;
                              const idB = parseInt(b.bookId.replace(/\D/g, ''), 10) || 0;
                              if (idA !== idB) return idA - idB;
                              return a.bookId.localeCompare(b.bookId, undefined, { numeric: true });
                            });

                      if (listToSearch.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-450 text-xs italic">
                            No active matching results found. Use different keywords.
                          </div>
                        );
                      }

                      return listToSearch.map(b => {
                        const isSelected = walkinBookIds.includes(b.bookId);
                        const catSerial = categorySerialsMap.get(b.bookId) || "01";
                        return (
                          <button
                            type="button"
                            key={b.bookId}
                            onClick={() => {
                              if (isSelected) {
                                setWalkinBookIds(prev => prev.filter(id => id !== b.bookId));
                              } else {
                                setWalkinBookIds(prev => [...prev, b.bookId]);
                              }
                            }}
                            className={`w-full text-left p-3.5 flex justify-between items-center transition-all ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-extrabold border-l-4 border-indigo-600'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-755 dark:text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-3 space-y-0.5">
                              <span className="font-extrabold block text-slate-905 dark:text-white text-xs">{b.bookName}</span>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                                <span>by <b className="text-slate-705 dark:text-slate-400">{b.author}</b></span>
                                <span>•</span>
                                <span>Shelf Sr: <b className="text-amber-700 dark:text-amber-400 font-sans font-extrabold">#{catSerial}</b></span>
                              </div>
                              <div className="flex gap-2 text-[9px] font-mono text-slate-400">
                                <span>Acc: {b.accessionNumber || b.bookId}</span>
                                <span>Book #: {b.bookNumber || "N/A"}</span>
                                <span>Call #: {b.callNumber || "N/A"}</span>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1 select-none">
                              <span className={`text-[10px] border px-2 py-0.5 rounded-md font-mono font-bold ${
                                b.availableCopies > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-red-50 text-red-800 border-red-200'
                              }`}>
                                {b.availableCopies} left
                              </span>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Selected Books Tags */}
                {walkinBookIds.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-805 rounded-xl space-y-2 mt-3 select-none">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 block font-mono">
                        Selected Basket ({walkinBookIds.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setWalkinBookIds([])}
                        className="text-[10px] text-red-650 hover:underline font-bold"
                      >
                        Clear Basket Items
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pb-1 animate-fade-in">
                      {walkinBookIds.map(id => {
                        const bk = books.find(b => b.bookId === id);
                        if (!bk) return null;
                        const catSerial = categorySerialsMap.get(id) || "01";
                        return (
                          <div
                            key={id}
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1 text-[10px] font-bold flex items-center justify-between gap-1.5"
                          >
                            <span className="truncate max-w-[190px]">
                              {bk.bookName} (Shelf #{catSerial})
                            </span>
                            <button
                              type="button"
                              onClick={() => setWalkinBookIds(prev => prev.filter(x => x !== id))}
                              className="text-red-400 hover:text-red-350 px-1 font-black text-xs cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: TRANSACTION SUBMITTER PANEL (col-span-3) */}
              <div className="xl:col-span-3 space-y-5 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleManualIssueSubmit(e);
                  setShowIssueModal(false);
                }} className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                      <span className="text-amber-655 dark:text-amber-400 font-extrabold text-[10px] uppercase font-mono tracking-widest block">STEP 3 / चरण ३</span>
                      <h3 className="text-base font-black text-slate-850 dark:text-white uppercase">
                        Ledger Execution (वापसी तिथि)
                      </h3>
                    </div>

                    {/* Return Date selection */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block pb-1 border-b border-slate-100 w-full mb-1">
                        Select Return Due Date (वापसी नियत तिथि)
                      </label>
                      <input
                        type="date"
                        required
                        value={walkinDueDate}
                        onChange={(e) => setWalkinDueDate(e.target.value)}
                        className="w-full text-sm font-black p-3 bg-white dark:bg-slate-900 border-2 border-slate-400 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none"
                      />
                      <p className="text-[10px] text-slate-400 leading-snug font-mono block pt-1 select-none">
                        ⚠️ Rule mandate: Librarians must manually select this due calendar date on physical issue execution!
                      </p>
                    </div>

                    {/* Verification desk highlights */}
                    <div className="bg-amber-50 dark:bg-amber-950/10 p-4 border border-amber-200 rounded-xl">
                      <div className="text-[10px] uppercase font-extrabold text-amber-850 flex items-center gap-1">
                        📄 Desk Receipt Agreement
                      </div>
                      <p className="text-[10px] text-slate-655 mt-1 leading-relaxed">
                        By issuing books, you instantly authorize log ledgers under standard school codes. Automatic overdue notices will trigger upon date expiry.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-6">
                    <button
                      type="submit"
                      disabled={!matchedWalkinStudent || walkinBookIds.length === 0}
                      className={`w-full p-4 font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
                        matchedWalkinStudent && walkinBookIds.length > 0
                          ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black shadow-lg hover:scale-[1.01]'
                          : 'bg-slate-200 dark:bg-slate-805 text-slate-400 dark:text-slate-500 cursor-not-allowed border-2 border-slate-300 dark:border-slate-700'
                      }`}
                      id="submit-desk-ledger-distribution-confirm"
                    >
                      <ArrowUpRight className="w-5 h-5 shrink-0 stroke-[3]" />
                      <span>Issue Book(s) (पुस्तक जारी करें)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowIssueModal(false)}
                      className="w-full text-center p-2 text-[11px] text-slate-400 hover:text-red-500 hover:underline cursor-pointer select-none"
                    >
                      Cancel and Exit Work (रद्द करें)
                    </button>
                  </div>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 2. LIBRARIAN REQUEST DETAILS DIALOG */}
      {selectedRequestDetails && (() => {
        const student = students.find(s => s.rollNumber === selectedRequestDetails.rollNumber);
        const book = books.find(b => b.bookId === selectedRequestDetails.bookId);
        
        const currentApproveDate = approvalDates[selectedRequestDetails.id] || (() => {
          const d = new Date();
          d.setDate(d.getDate() + 14);
          return d.toISOString().split('T')[0];
        })();

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[999] font-sans" id="librarian-request-details-modal">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in text-slate-900 dark:text-slate-100">
              
              {/* Header */}
              <div className="bg-[#0f172a] text-amber-400 p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider">📚 Borrow Request Verification Panel</span>
                  <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-mono font-bold">RQ ID: {selectedRequestDetails.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedRequestDetails(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-slate-100">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Student Information Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3">
                    <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-205 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 select-none">
                      <User className="w-4 h-4 text-slate-600" />
                      <span>Student Information</span>
                    </h4>
                    
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Name</span>
                        <span className="font-extrabold text-[#0f172a] dark:text-slate-200">{selectedRequestDetails.studentName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Class</span>
                        <span className="font-extrabold text-[#0f172a] dark:text-slate-200">Grade {student?.class || "10"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Section</span>
                        <span className="font-extrabold text-[#0f172a] dark:text-slate-200">Section {student?.section || "A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Roll Number</span>
                        <span className="font-bold text-amber-700">Roll #{selectedRequestDetails.rollNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Request Timeline Information Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3">
                    <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-205 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 select-none">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span>Request Information</span>
                    </h4>
                    
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Request Date</span>
                        <span className="font-extrabold text-[#0f172a] dark:text-slate-250">{selectedRequestDetails.requestDate}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Request Time</span>
                        <span className="font-extrabold text-[#0f172a] dark:text-slate-250">
                          {selectedRequestDetails.id.split('-').pop() ? "10:00 AM (School Register Default)" : "Registry Time"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 uppercase font-sans font-bold">Initial Flag State</span>
                        <span className="font-bold text-slate-500 uppercase">Awaiting Action</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Student's Custom Borrow request Comment (Requirement #2) */}
                {selectedRequestDetails.comment && (
                  <div className="bg-amber-50 dark:bg-amber-950/25 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 font-sans tracking-wider block">
                      💬 Student's Custom Request Note (Decision Reference):
                    </span>
                    <p className="text-xs font-semibold text-amber-950 dark:text-amber-300 italic">
                      "{selectedRequestDetails.comment}"
                    </p>
                  </div>
                )}

                {/* Book Placement Spec Section */}
                {book ? (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3">
                    <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-205 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 select-none">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span>Book Shelf & Localization Information</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Book Name</span>
                          <span className="font-extrabold text-slate-950 dark:text-slate-100 text-right font-sans">{book.bookName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Author</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-250 text-right">{book.author}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Publisher</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-right">{book.publisher || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Category</span>
                          <span className="font-extrabold text-[#0f172a] dark:text-slate-200 font-sans">{book.category}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Shelf Serial Number</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            #{categorySerialsMap.get(book.bookId) || 1}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Accession Number</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-250">{book.accessionNumber || book.bookId || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Call Number</span>
                          <span className="font-extrabold text-indigo-850 dark:text-slate-255">{book.callNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-400 uppercase font-sans font-bold">Book Number</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-250">{book.bookNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50 border-transparent">
                          <span className="text-slate-400 uppercase font-sans font-bold">Availability Status</span>
                          <span className={`font-black ${book.availableCopies > 0 ? 'text-emerald-600' : 'text-red-650'}`}>
                            {book.availableCopies > 0 ? `AVAILABLE (${book.availableCopies} Copies Available)` : "NOT AVAILABLE"}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-500 font-bold">Warning: Book metadata not found in active catalog register.</p>
                )}

                {/* Due Date setting selector wrapper */}
                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase text-slate-500 block">Librarian Due Date Selector:</span>
                    <p className="text-[11px] text-slate-450">Set a customizable return date limit (Standard is 14 days)</p>
                  </div>
                  <input
                    type="date"
                    required
                    value={currentApproveDate}
                    onChange={(e) => setApprovalDates(prev => ({ ...prev, [selectedRequestDetails.id]: e.target.value }))}
                    className="text-xs p-2 font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-350 rounded-lg outline-none w-44"
                  />
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRequestDetails(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs text-slate-700 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRejectRequest(selectedRequestDetails.id);
                    setSelectedRequestDetails(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Borrow Request</span>
                </button>
                {onHoldRequest && (
                  <button
                    type="button"
                    onClick={() => {
                      onHoldRequest(selectedRequestDetails.id);
                      setSelectedRequestDetails(null);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Hold Request</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onApproveRequest(selectedRequestDetails.id, currentApproveDate);
                    setSelectedRequestDetails(null);
                  }}
                  disabled={book && book.availableCopies <= 0}
                  className={`px-4 py-2 font-black text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    book && book.availableCopies > 0
                      ? 'bg-emerald-650 hover:bg-emerald-750 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve & Authorize Issue</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
