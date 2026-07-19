/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PublicHome, { GoogleBookCover } from './components/PublicHome';
import LibraryPortal from './components/LibraryPortal';
import { translations } from './localization';
import { Book, Student, BorrowRequest, BookIssueLog, UserRole, LibraryAuditLog, StudyMaterial, Notification } from './types';
import { initialBooks, initialStudents, initialRequests, initialIssueLogs } from './data/initialData';
import { Home, BookOpen, HelpCircle, LogOut, Key, Landmark, ArrowLeft } from 'lucide-react';

export default function App() {
  // --- Back-End Synced Database States ---
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [issueLogs, setIssueLogs] = useState<BookIssueLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<LibraryAuditLog[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isBooksLoading, setIsBooksLoading] = useState<boolean>(true);

  // --- QR/Barcode Scan Navigation Route State ---
  const [scannedAccession, setScannedAccession] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/book/')) {
      return decodeURIComponent(path.substring(6));
    }
    return null;
  });

  const [scannedBook, setScannedBook] = useState<Book | null>(null);
  const [scannedBookLoading, setScannedBookLoading] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [hasActiveLoan, setHasActiveLoan] = useState<boolean>(false);

  useEffect(() => {
    const handleLocationCheck = () => {
      const path = window.location.pathname;
      if (path.startsWith('/book/')) {
        setScannedAccession(decodeURIComponent(path.substring(6)));
      } else {
        setScannedAccession(null);
      }
    };
    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, []);

  const handleCloseScannedBook = () => {
    window.history.pushState(null, '', '/');
    setScannedAccession(null);
    setActiveTab('home');
  };

  // --- Dynamic Layout Configuration States ---
  const [currentLang, setCurrentLang] = useState<'EN' | 'HI'>('EN');
  const [fontSizeLarge, setFontSizeLarge] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'portal' | 'docs'>('home');

  // --- Secure Session Authentication States ---
  const [loggedInRole, setLoggedInRole] = useState<UserRole | 'Guest'>('Guest');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  const [loggedInName, setLoggedInName] = useState<string>('');


  // --- Progressive Excel Upload Progress States ---
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'uploading';
    processed: number;
    total: number;
    type: 'books' | 'students';
  }>({ status: 'idle', processed: 0, total: 0, type: 'books' });

  const isSyncingRef = useRef(false);

  const t = translations[currentLang];

  // Refresh all system metrics and records from servers safely
  const refreshData = async (force: boolean = true) => {
    if (scannedAccession !== null) {
      if (scannedBookLoading) return;
      setScannedBookLoading(true);
      try {
        const token = localStorage.getItem("ramdiri_library_token");
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/books/by-accession/${encodeURIComponent(scannedAccession)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setScannedBook(data.book);
            setHasPendingRequest(data.hasPendingRequest);
            setHasActiveLoan(data.hasActiveLoan);
          } else {
            setScannedBook(null);
          }
        } else {
          setScannedBook(null);
        }
      } catch (err) {
        console.error("Failed to fetch scanned book details:", err);
        setScannedBook(null);
      } finally {
        setScannedBookLoading(false);
        setIsBooksLoading(false);
      }
      return;
    }

    if (isSyncingRef.current && !force) return;
    isSyncingRef.current = true;
    try {
      const handleSafeFetch = async (url: string, init?: RequestInit) => {
        try {
          const res = await fetch(url, init);
          if (res.ok) {
            return await res.json();
          } else {
            console.warn(`Server responded with safe-fetch warning for ${url}: status ${res.status}`);
          }
        } catch (err: any) {
          console.warn(`Database sync offline transition for ${url}: ${err?.message || err}`);
        }
        return null;
      };

      const token = localStorage.getItem("ramdiri_library_token");
      let role: string | null = null;
      let headers: any = {};
      if (token) {
        try {
          const payloadStr = atob(token.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          role = payload.role;
          headers = { 'Authorization': `Bearer ${token}` };
        } catch (e) {
          console.warn("Could not parse token:", e);
        }
      }

      if (role === 'Librarian') {
        const [dataBooks, dataMaterials, studentsData, requestsData, logsData, auditData, dataNotifications] = await Promise.all([
          handleSafeFetch('/api/books'),
          handleSafeFetch('/api/study-materials', { headers }),
          handleSafeFetch('/api/students', { headers }),
          handleSafeFetch('/api/requests', { headers }),
          handleSafeFetch('/api/issue-logs', { headers }),
          handleSafeFetch('/api/audit-logs', { headers }),
          handleSafeFetch('/api/notifications', { headers })
        ]);

        if (dataBooks) setBooks(dataBooks);
        if (dataMaterials) setStudyMaterials(dataMaterials);
        if (studentsData) setStudents(studentsData);
        if (requestsData) setRequests(requestsData);
        if (logsData) setIssueLogs(logsData);
        if (auditData) setAuditLogs(auditData);
        if (dataNotifications) setNotifications(dataNotifications);
      } else if (role === 'Student') {
        const [dataBooks, dataMaterials, requestsData, logsData, dataNotifications] = await Promise.all([
          handleSafeFetch('/api/books'),
          handleSafeFetch('/api/study-materials', { headers }),
          handleSafeFetch('/api/requests', { headers }),
          handleSafeFetch('/api/issue-logs', { headers }),
          handleSafeFetch('/api/notifications', { headers })
        ]);

        if (dataBooks) setBooks(dataBooks);
        if (dataMaterials) setStudyMaterials(dataMaterials);
        if (requestsData) setRequests(requestsData);
        if (logsData) setIssueLogs(logsData);
        if (dataNotifications) setNotifications(dataNotifications);
      } else {
        const [dataBooks, dataMaterials] = await Promise.all([
          handleSafeFetch('/api/books'),
          handleSafeFetch('/api/study-materials')
        ]);

        if (dataBooks) setBooks(dataBooks);
        if (dataMaterials) setStudyMaterials(dataMaterials);
        setNotifications([]);
      }
    } finally {
      isSyncingRef.current = false;
      setIsBooksLoading(false);
    }
  };

  // Sync operations on mount, role transitions, and scanned accession route changes
  useEffect(() => {
    refreshData();
  }, [loggedInRole, scannedAccession]);

  useEffect(() => {
    if (scannedAccession === null) {
      setScannedBook(null);
      setHasPendingRequest(false);
      setHasActiveLoan(false);
    }
  }, [scannedAccession]);

  // Automated background retry to resolve cold-start race conditions seamlessly
  useEffect(() => {
    if (scannedAccession !== null) return;
    if (books.length > 0) {
      setIsBooksLoading(false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 6;
    
    const interval = setInterval(async () => {
      retryCount++;
      console.log(`[DLMS AUTO-RECOVERY] Attempting catalog synchronization, try #${retryCount}...`);
      
      try {
        const res = await fetch('/api/books');
        if (res.ok) {
          const freshBooks = await res.json();
          if (freshBooks && freshBooks.length > 0) {
            setBooks(freshBooks);
            setIsBooksLoading(false);
            console.log(`[DLMS AUTO-RECOVERY] Successfully resolved race condition on attempt #${retryCount}. ${freshBooks.length} books loaded.`);
            clearInterval(interval);
            return;
          }
        }
      } catch (err) {
        console.warn("[DLMS AUTO-RECOVERY] Fetch retry failed:", err);
      }

      if (retryCount >= maxRetries) {
        setIsBooksLoading(false);
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [books.length, scannedAccession]);

  // Real-time synchronization poll for students and librarians (Critical Issue 5)
  useEffect(() => {
    if (scannedAccession !== null) return;
    // Poll every 3000ms to ensure real-time synchronization of state without stale data or manual refreshes
    const interval = setInterval(() => {
      refreshData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [scannedAccession]);

  // Try to restore session on boot
  useEffect(() => {
    const checkToken = localStorage.getItem("ramdiri_library_token");
    if (checkToken) {
      try {
        const payloadStr = atob(checkToken.split('.')[1]);
        const payload = JSON.parse(payloadStr);

        // Check if locally expired first
        const isExpired = payload.exp && payload.exp < (Date.now() / 1000);
        if (isExpired) {
          console.warn("Session expired locally.");
          localStorage.removeItem("ramdiri_library_token");
          setLoggedInRole('Guest');
          setLoggedInStudent(null);
          setLoggedInName('');
          setActiveTab('home');
          return;
        }

        // Verify with backend
        fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${checkToken}`
          }
        })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            console.warn("Verification failed. Revoking active credentials.");
            handleLogout();
          } else {
            if (payload.role === 'Librarian') {
              setLoggedInRole('Librarian');
              setLoggedInName(payload.name || "Not configured");
            } else if (payload.role === 'Student') {
              setLoggedInRole('Student');
              if (data.student) {
                setLoggedInStudent(data.student);
                setLoggedInName(data.student.name);
              } else {
                setLoggedInName(payload.name || "Scholar Reader");
                const sClass = payload.class || "10";
                const sSection = payload.section || "A";
                const rNum = Number(payload.rollNumber) || 0;
                setLoggedInStudent({
                  studentId: payload.studentId || `${sClass}-${sSection}-${rNum}`,
                  name: payload.name || "Student Reader",
                  rollNumber: rNum,
                  dob: "2010-01-01",
                  class: sClass,
                  section: sSection
                });
              }
            }
          }
        })
        .catch(() => {
          console.warn("Backend verification timeout. Residing on local tokens.");
        });
      } catch (err) {
        localStorage.removeItem("ramdiri_library_token");
      }
    }
  }, []);



  // Update dynamic logged-in student profile if student database changes with strict multi-coordinate isolation mapping
  useEffect(() => {
    if (loggedInRole === 'Student' && loggedInStudent) {
      const live = students.find(s => {
        const idA = (s.studentId || `${s.class}-${s.section}-${s.rollNumber}`).trim().toLowerCase();
        const idB = (loggedInStudent.studentId || `${loggedInStudent.class}-${loggedInStudent.section}-${loggedInStudent.rollNumber}`).trim().toLowerCase();
        
        // Exact match coordinates
        const matchId = idA === idB;
        const matchCoords = s.class?.toString().trim().toLowerCase() === loggedInStudent.class?.toString().trim().toLowerCase() &&
                            s.section?.toString().trim().toUpperCase() === loggedInStudent.section?.toString().trim().toUpperCase() &&
                            Number(s.rollNumber) === Number(loggedInStudent.rollNumber);
        
        return matchId || matchCoords;
      });
      if (live) {
        setLoggedInStudent(live);
      }
    }
  }, [students, loggedInRole]);

  // Synchronize state with URL hash for perfect Back button behavior on mobile devices
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'docs') {
        setActiveTab('docs');
      } else if (hash === 'portal') {
        setActiveTab('portal');
      } else {
        setActiveTab('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initialize state from hash on mount
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Sync state changes to Hash
  useEffect(() => {
    const currentHash = window.location.hash.substring(1);
    if (activeTab !== currentHash) {
      if (activeTab === 'home') {
        if (currentHash !== '') {
          window.history.replaceState(null, '', ' ');
        }
      } else {
        window.location.hash = activeTab;
      }
    }
  }, [activeTab]);

  // --- Handle Login Completion ---
  const handleLoginSuccess = (role: 'Student' | 'Librarian', student?: Student) => {
    if (role === 'Student' && student) {
      setLoggedInRole('Student');
      setLoggedInStudent(student);
      setLoggedInName(student.name);
      setActiveTab('portal');
    } else if (role === 'Librarian') {
      setLoggedInRole('Librarian');
      setLoggedInStudent(null);
      const token = localStorage.getItem("ramdiri_library_token");
      let dName = "Not configured";
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          dName = payload.name || dName;
        } catch (e) {}
      }
      setLoggedInName(dName);
      setActiveTab('portal');
    }
    refreshData();
  };

  // --- Handle Logout ---
  const handleLogout = () => {
    localStorage.removeItem("ramdiri_library_token");
    setLoggedInRole('Guest');
    setLoggedInStudent(null);
    setLoggedInName('');
    setActiveTab('home');
  };

  // --- Direct login launcher helper ---
  const handleTriggerLoginClick = () => {
    setActiveTab('home');
    setTimeout(() => {
      const loginTrigger = document.getElementById("home-trigger-login-btn");
      if (loginTrigger) {
        loginTrigger.click();
        loginTrigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // --- SECURE BACKEND DATABASE OPERATIONS CALLBACKS ---

  // 1. Add Book Listing
  const handleAddBook = async (book: Book) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(book)
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const errorData = await resp.json();
        alert(`Error adding book: ${errorData.error}`);
      }
    } catch (err) {
      alert("Network connection fault. Unable to register book.");
    }
  };

  // 2. Edit Book specifications
  const handleEditBook = async (updated: Book) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/books/${updated.bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const errorData = await resp.json();
        alert(`Error modifying book details: ${errorData.error}`);
      }
    } catch (err) {
      alert("Network connection fault.");
    }
  };

  // 3. Delete Book asset from catalog
  const handleDeleteBook = async (id: string) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const err = await resp.json();
        alert(`Deletion Failed: ${err.error}`);
      }
    } catch (err) {
      alert("Network fault.");
    }
  };

  // 3b. Delete Selected Books Bulk
  const handleDeleteBooksBulk = async (ids: string[]) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/books/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookIds: ids })
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const err = await resp.json();
        alert(`Bulk Deletion Failed: ${err.error}`);
      }
    } catch (err) {
      alert("Network fault during bulk deletion.");
    }
  };

  // 3c. Clear Books Inventory Completely
  const handleClearBooksInventory = async () => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/books/clear-inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const err = await resp.json();
        alert(`Failed to clear books catalog: ${err.error}`);
      }
    } catch (err) {
      alert("Network fault while trying to clear books catalog.");
    }
  };

  // 4. Excel Bulk Import Books
  const handleImportBooksExcel = async (imported: Book[]) => {
    const token = localStorage.getItem("ramdiri_library_token");
    const chunkSize = 150;
    const total = imported.length;
    
    setImportProgress({
      status: 'uploading',
      processed: 0,
      total,
      type: 'books'
    });

    let totalSaved = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = imported.slice(i, i + chunkSize);
        const resp = await fetch('/api/books/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ books: chunk })
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Chunk upload failed.");
        }
        const data = await resp.json();
        totalSaved += data.count || 0;
        totalSkipped += data.skippedCount || 0;

        setImportProgress(prev => ({
          ...prev,
          processed: Math.min(i + chunk.length, total)
        }));
        // Artificial split microtask deferral to keep the browser render loop fluid & responsive
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      await refreshData();
      if (totalSkipped > 0) {
        alert(`Registry synchronization completed:\n- ${totalSaved} new books imported successfully.\n- ${totalSkipped} duplicate books (having pre-existing Accession/ID) were skipped.`);
      } else {
        alert(`Synchronized all ${totalSaved} book records with library inventory files successfully!`);
      }
    } catch (err: any) {
      console.error("Progressive bulk books import triggered error:", err);
      alert(`Import paused: ${err.message || "Network fault"}`);
    } finally {
      setImportProgress({ status: 'idle', processed: 0, total: 0, type: 'books' });
    }
  };

  // 5. Excel Bulk Import Students
  const handleImportStudentsExcel = async (imported: Student[]) => {
    const token = localStorage.getItem("ramdiri_library_token");
    const chunkSize = 150;
    const total = imported.length;

    setImportProgress({
      status: 'uploading',
      processed: 0,
      total,
      type: 'students'
    });

    let totalSaved = 0;
    let totalSkipped = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const allErrors: string[] = [];

    try {
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = imported.slice(i, i + chunkSize);
        const resp = await fetch('/api/students/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ students: chunk })
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Chunk student upload failed.");
        }
        const data = await resp.json();
        totalSaved += data.count || 0;
        totalSkipped += data.skippedCount || 0;
        totalUpdated += data.updatedCount || 0;
        totalErrors += data.errorCount || 0;
        if (data.errors && Array.isArray(data.errors)) {
          allErrors.push(...data.errors);
        }

        setImportProgress(prev => ({
          ...prev,
          processed: Math.min(i + chunk.length, total)
        }));
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      await refreshData();
      
      if (totalErrors > 0) {
        alert(`Student enrollment import finished with warnings:\n- ${totalSaved} new students enrolled.\n- ${totalUpdated} existing students updated.\n- ${totalSkipped} duplicates skipped.\n- ${totalErrors} records failed.\n\nFirst 5 Errors:\n${allErrors.slice(0, 5).join('\n')}`);
      } else if (totalSkipped > 0 || totalUpdated > 0) {
        alert(`Student enrollment import finished:\n- ${totalSaved} new students enrolled.\n- ${totalUpdated} existing students updated.\n- ${totalSkipped} duplicate student records (same Class, Section, and Roll) were skipped.`);
      } else {
        alert(`Enrolled all ${totalSaved} students in the school library login list successfully!`);
      }
    } catch (err: any) {
      console.error("Progressive student import triggered error:", err);
      alert(`Student import paused: ${err.message || "Network fault"}`);
    } finally {
      setImportProgress({ status: 'idle', processed: 0, total: 0, type: 'students' });
    }
  };

  // 5.1 Manual Add Student
  const handleAddStudent = async (student: Student): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(student)
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to Add Student: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Add student triggered error:", err);
      alert("Network fault during student creation.");
      return false;
    }
  };

  // 5.2 Manual Edit Student
  const handleEditStudent = async (student: Student): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/students/${student.studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(student)
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to Edit Student: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Edit student triggered error:", err);
      alert("Network fault during student editing.");
      return false;
    }
  };

  // 5.3 Manual Delete Student
  const handleDeleteStudent = async (studentId: string): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to Delete Student: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Delete student triggered error:", err);
      alert("Network fault during student deletion.");
      return false;
    }
  };

  // 5.4 Manual Bulk Delete Students
  const handleDeleteStudentsBulk = async (studentIds: string[]): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentIds })
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to Delete Selected Students: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Bulk delete students triggered error:", err);
      alert("Network fault during bulk student deletion.");
      return false;
    }
  };

  // 5.5 Manual Clear Students Registry Completely
  const handleClearStudentsRegistry = async (): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/students/clear-registry', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to clear students registry: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Clear student registry triggered error:", err);
      alert("Network fault during student registry clearing.");
      return false;
    }
  };

  // 5.6 Backup Database - downloads full database backup file
  const handleBackupDatabase = async () => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/database/backup', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ramdiri_library_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const err = await resp.json();
        alert(`Failed to export database backup: ${err.error}`);
      }
    } catch (err) {
      console.error("Backup triggered error:", err);
      alert("Network fault during automatic database export.");
    }
  };

  // 5.7 Restore Database - restores full database from upload payload
  const handleRestoreDatabase = async (payload: any): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to restore database backup: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Restore triggered error:", err);
      alert("Network fault during database restore import.");
      return false;
    }
  };

  // 6. Request a Checkout from Student Catalog
  const handleAddRequest = async (req: BorrowRequest): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(req)
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Request denied." };
      }
    } catch (err: any) {
      console.error("Request creation failed:", err);
      return { success: false, error: err.message || "Network error." };
    }
  };

  // 7. Approve a pending Borrow request
  const handleApproveRequest = async (id: string, dueDate?: string): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dueDate })
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Approval denied." };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "Network error." };
    }
  };

  // 8. Reject a pending borrow request
  const handleRejectRequest = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Rejection failed." };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "Network error." };
    }
  };

  // 8.1 Hold a pending borrow request (Librarian)
  const handleHoldRequest = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/requests/${id}/hold`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Hold failed." };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "Network error." };
    }
  };

  const handleAddStudyMaterial = async (material: Omit<StudyMaterial, 'id' | 'createdAt'>) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/study-materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(material)
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to upload material: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteStudyMaterial = async (id: string) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/study-materials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Failed to delete material: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 8.5 Cancel a pending checkout request (Student)
  const handleCancelRequest = async (id: string) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/requests/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return true;
      } else {
        const err = await resp.json();
        alert(`Cancellation failed: ${err.error}`);
        return false;
      }
    } catch (err) {
      console.error("Cancel request failed:", err);
      return false;
    }
  };

  // 9. Process physical Check-In / Book Returns
  const handleReturnBook = async (logId: string): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/issue-logs/${logId}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Return check-in failed." };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "Network error." };
    }
  };

  // Bulk issue books direct-desk action
  const handleBulkIssue = async (payload: {
    rollNumber: string;
    class: string;
    section: string;
    studentName: string;
    bookIds: string[];
    dueDate: string;
  }) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/issue-logs/bulk-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        await refreshData();
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || "Execution failed on server." };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err?.message || "Fault in network synchronization." };
    }
  };

  // 10. Reseeds entire cloud database dynamically
  const handleResetDatabase = async () => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/database/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData();
        alert("Success: Cloud database restored to factory-seed conditions.");
      } else {
        alert("Security Authorization failed during system resets.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Notifications Interactive Handlers ---
  const handleMarkNotificationRead = async (id: string): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/notifications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Read' })
      });
      if (resp.ok) {
        await refreshData(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Mark notification read failed:", err);
      return false;
    }
  };

  const handleArchiveNotification = async (id: string): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/notifications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Archived' })
      });
      if (resp.ok) {
        await refreshData(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Archive notification failed:", err);
      return false;
    }
  };

  const handleMarkAllNotificationsRead = async (): Promise<boolean> => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await refreshData(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Mark all notifications read failed:", err);
      return false;
    }
  };

  // --- Dynamic Stats calculation for homepage highlights ---
  const statsSummary = {
    totalBooks: books.reduce((sum, b) => sum + b.totalCopies, 0),
    availableBooks: books.reduce((sum, b) => sum + b.availableCopies, 0),
    issuedBooks: Math.max(0, books.reduce((sum, b) => sum + (b.totalCopies - b.availableCopies), 0)),
    activeReaders: students.length
  };

  const [requestSubmitting, setRequestSubmitting] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<boolean>(false);

  const handleScannedBookRequest = async () => {
    if (!scannedBook || loggedInRole !== 'Student' || !loggedInStudent) return;
    setRequestSubmitting(true);
    setRequestError(null);
    setRequestSuccess(false);

    const token = localStorage.getItem("ramdiri_library_token");
    const reqPayload: BorrowRequest = {
      id: "REQ-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      studentName: loggedInStudent.name,
      rollNumber: loggedInStudent.rollNumber,
      class: loggedInStudent.class,
      section: loggedInStudent.section,
      studentId: loggedInStudent.studentId,
      bookId: scannedBook.bookId,
      bookName: scannedBook.bookName,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };

    try {
      const resp = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqPayload)
      });
      if (resp.ok) {
        setRequestSuccess(true);
        setHasPendingRequest(true);
        // Instantly decrement locally in UI to avoid stale views
        setScannedBook(prev => prev ? {
          ...prev,
          availableCopies: Math.max(0, prev.availableCopies - 1)
        } : null);
      } else {
        const data = await resp.json();
        setRequestError(data.error || "Failed to submit borrow request.");
      }
    } catch (err: any) {
      console.error("Scanned book request failed:", err);
      setRequestError(err.message || "Network error occurred.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (scannedAccession !== null) {
    const matchedBook = scannedBook;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none justify-between">
        {/* Tricolor Government visual band */}
        <div className="h-1.5 shrink-0 flex select-none" role="presentation">
          <div className="bg-[#f97316] w-1/3"></div>
          <div className="bg-white w-1/3"></div>
          <div className="bg-[#16a34a] w-1/3"></div>
        </div>

        {/* Header bar */}
        <header className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow">
              <Landmark className="w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs text-white uppercase tracking-wider">PM SHRI RAMDIRI +2 HIGH SCHOOL</h1>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider block">Digital Library Scanner Portal</span>
            </div>
          </div>
          <button
            onClick={handleCloseScannedBook}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Portal Home</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-4 md:p-8 flex items-center justify-center max-w-4xl mx-auto w-full">
          {scannedBookLoading ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-mono">Synchronizing dynamic book register details...</p>
            </div>
          ) : !matchedBook ? (
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-red-950/35 border border-red-800/50 flex items-center justify-center mx-auto text-red-500 text-2xl font-black">
                ✕
              </div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Book Entry Not Registered</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                No active catalog record was found matching accession number <strong className="text-amber-400 font-mono">"{scannedAccession}"</strong>.
              </p>
              <p className="text-[11px] text-slate-500 leading-normal">
                Please verify the printed label accession number or register this entry inside the Librarian Portal.
              </p>
              <button
                onClick={handleCloseScannedBook}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Return to Library Homepage
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl w-full flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8">
              {/* Cover Image */}
              <div className="w-40 sm:w-48 mx-auto md:mx-0 shrink-0 aspect-[3/4] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
                <GoogleBookCover 
                  bookName={matchedBook.bookName} 
                  author={matchedBook.author} 
                  coverImage={matchedBook.coverImage} 
                />
              </div>

              {/* Information */}
              <div className="flex-grow space-y-4">
                <div className="space-y-1">
                  <span className="text-[9.5px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-block">
                    {matchedBook.category || "General"}
                  </span>
                  <h2 className="text-lg md:text-xl font-black text-white leading-tight">
                    {matchedBook.bookName}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    by <span className="text-slate-200 font-black">{matchedBook.author || "Unknown"}</span>
                  </p>
                </div>

                {/* Grid Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl font-mono text-[11px] text-slate-350">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Accession Number</span>
                    <span className="text-slate-100 font-black">{matchedBook.accessionNumber || matchedBook.bookId}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Call Number</span>
                    <span className="text-slate-100 font-black">{matchedBook.callNumber || "-"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Book Number</span>
                    <span className="text-slate-100 font-black">{matchedBook.bookNumber || "-"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Shelf Number</span>
                    <span className="text-emerald-450 font-black">{matchedBook.shelfNumber || "-"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Publisher</span>
                    <span className="text-slate-100 font-black line-clamp-1">{matchedBook.publisher || "-"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Availability Status</span>
                    {matchedBook.availableCopies > 0 ? (
                      <span className="text-emerald-450 font-black">Available ({matchedBook.availableCopies}/{matchedBook.totalCopies})</span>
                    ) : (
                      <span className="text-red-400 font-black">Issued Out (0/{matchedBook.totalCopies})</span>
                    )}
                  </div>
                </div>

                {/* Description block */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Book Abstract / Synopsis</h4>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans bg-slate-900/20 p-3 rounded-lg border border-slate-850">
                    {matchedBook.description || "No summary details registered for this syllabus textbook resource."}
                  </p>
                </div>

                {/* Request Actions (P0 Role-based Request Book security mandates) */}
                <div className="pt-2 border-t border-slate-800/60 space-y-3">
                  {loggedInRole === 'Student' ? (
                    <div className="space-y-2">
                      {hasPendingRequest ? (
                        <div className="w-full text-center py-2.5 bg-slate-850/80 border border-amber-500/20 rounded-xl text-amber-400 font-bold text-xs select-none">
                          ✓ Pending Checkout Request Awaiting Librarian Issue
                        </div>
                      ) : hasActiveLoan ? (
                        <div className="w-full text-center py-2.5 bg-slate-850/80 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-xs select-none">
                          📖 You currently have this copy active on your library account
                        </div>
                      ) : matchedBook.availableCopies <= 0 ? (
                        <div className="w-full text-center py-2.5 bg-slate-850/80 border border-red-500/25 rounded-xl text-red-400 font-bold text-xs select-none">
                          ✕ Out of Stock: All copies are currently issued to other readers
                        </div>
                      ) : (
                        <button
                          onClick={handleScannedBookRequest}
                          disabled={requestSubmitting}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          {requestSubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Sending Request...</span>
                            </>
                          ) : (
                            <span>✅ Request Book for Issue</span>
                          )}
                        </button>
                      )}

                      {requestError && (
                        <p className="text-[10.5px] text-red-400 font-bold bg-red-950/20 border border-red-900/40 px-3 py-1.5 rounded-lg font-mono">
                          ✕ {requestError}
                        </p>
                      )}
                      {requestSuccess && (
                        <p className="text-[10.5px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/40 px-3 py-1.5 rounded-lg font-mono">
                          ✓ Your borrow request has been logged successfully! Go to the school library counters to pick up your copy.
                        </p>
                      )}
                    </div>
                  ) : loggedInRole === 'Librarian' ? (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 font-mono text-[10px] rounded-lg">
                      Librarian Mode Active: Use the Librarian Dashboard counters to issue or return this syllabus catalog entry.
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-950/25 border border-amber-900/40 rounded-xl space-y-1.5">
                      <p className="text-amber-400 font-extrabold text-xs">Student Login Required to Request Books</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        To request and borrow this syllabus textbook, you must be logged in with a registered student account. Return to the Portal Homepage and log in to request this title.
                      </p>
                    </div>
                  )}
                </div>

                {/* Back Button */}
                <button
                  onClick={handleCloseScannedBook}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Browse Digital Library Portal Home</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer info */}
        <footer className="h-10 bg-slate-950 border-t border-slate-850 px-6 flex items-center justify-between text-[11px] text-slate-550 shrink-0">
          <div className="hidden sm:flex gap-4">
            <span className="font-semibold text-emerald-400 font-mono">BSEB School Code: Begusarai-L01</span>
            <span>|</span>
            <span>Live Digital Stack Sync</span>
          </div>
          <div>
            &copy; 2026 PM SHRI Ramdiri +2 High School. All Rights Reserved.
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col md:flex-row transition-all bg-[#f4f7f5] text-slate-800 font-sans ${
        fontSizeLarge ? 'text-lg' : 'text-sm'
      }`}
      id="root-viewport-container"
    >
      {fontSizeLarge && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Sizing Scale Overrides for Librarians aged 45+ */
          body, html, div, p, span, td, th, input, select, button, a {
            font-size: 104% !important;
          }
          h1, h2, h3, h4 {
            font-size: 118% !important;
            font-weight: 900 !important;
          }
          span.text-xs, p.text-xs, td.text-xs, th.text-xs, button.text-xs, input.text-xs {
            font-size: 12.5px !important;
          }
          span.text-\\[10px\\], span.text-\\[9px\\] {
            font-size: 11.5px !important;
            letter-spacing: 0.05em !important;
          }
        `}} />
      )}
      
      {/* 1. LEFT NAVIGATION SIDEBAR (Desktop viewports) */}
      <aside className="w-64 bg-slate-900 text-slate-100 shrink-0 hidden md:flex flex-col shadow-xl border-r border-slate-800" id="school-sidebar-layout">
        
        {/* Government Crest representation */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-md transform hover:rotate-12 transition-transform duration-300">
              <Landmark className="w-5.5 h-5.5 text-slate-950" />
            </div>
            <div>
              <span className="text-white font-black text-xs uppercase tracking-wider block">RAMDIRI HIGH</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-widest block">BSEB BEGUSARAI</span>
            </div>
          </div>
        </div>

        {/* Navigation lists */}
        <nav className="flex-1 py-5 px-3.5 space-y-2 overflow-y-auto">
          
          <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-widest mb-1">
            {currentLang === 'EN' ? "Library Space" : "पुस्तकालय नेविगेशन"}
          </div>

          {[
            { id: 'home', label: t.navHome, icon: Home },
            { id: 'portal', label: t.navPortal, icon: BookOpen }
          ].map(item => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'portal' && loggedInRole === 'Guest') {
                    handleTriggerLoginClick();
                  } else {
                    setActiveTab(item.id as any);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-350 hover:text-white hover:bg-slate-850'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}

          <div className="pt-6">
            <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-widest mb-1.5">
              {currentLang === 'EN' ? "Active Account" : "सक्रिय खाता"}
            </div>
            
            {loggedInRole !== 'Guest' ? (
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider block font-bold">
                    🛡️ {loggedInRole === 'Librarian' ? (currentLang === 'HI' ? "पुस्तकालयाध्यक्ष" : "Librarian Deck") : (currentLang === 'HI' ? "छात्र पोर्टल" : "Student Reader")}
                  </span>
                  <span className="text-white text-xs font-extrabold line-clamp-1">
                    {loggedInName}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-red-700/80 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg tracking-wider flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{currentLang === 'EN' ? "Logout Session" : "लॉगआउट करें"}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleTriggerLoginClick}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl shadow transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-slate-950" />
                <span>{currentLang === 'EN' ? "Log In Portal" : "लॉगिन करें"}</span>
              </button>
            )}
          </div>

        </nav>

        {/* Footer info blocks inside sidebar */}
        <div className="p-4 bg-[#062013] border-t border-[#0d4f30] mt-auto shrink-0 text-center select-none">
          <span className="text-[9.5px] text-emerald-300 font-extrabold uppercase tracking-widest block font-mono">★★ RAMDIRI +2 HIGH ★★</span>
          <span className="text-[9px] text-emerald-500/80 mt-1 block">Bihar Secondary Education Board</span>
        </div>

      </aside>

      {/* 2. RIGHT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0" id="main-content-flow">
        
        {/* Tricolor India governmental visual tag line at top */}
        <div className="h-1.5 shrink-0 flex select-none" role="presentation">
          <div className="bg-[#f97316] w-1/3"></div>
          <div className="bg-white w-1/3"></div>
          <div className="bg-[#16a34a] w-1/3"></div>
        </div>

        {/* Bilingual Header Navigation */}
        <Header
          currentRole={loggedInRole}
          loggedInName={loggedInName || undefined}
          currentLang={currentLang}
          onLangChange={setCurrentLang}
          fontSizeLarge={fontSizeLarge}
          onFontSizeToggle={() => setFontSizeLarge(!fontSizeLarge)}
          isLoggedIn={loggedInRole !== 'Guest'}
          onLogout={handleLogout}
          onTriggerLoginClick={handleTriggerLoginClick}
        />

        {/* Mobile Navigation Bars (visible on small devices) */}
        <nav className="bg-[#093520] text-emerald-100 border-b border-[#0d4f30] p-1.5 md:hidden select-none shrink-0" id="mobile-navigation-tabs">
          <div className="flex items-center justify-around gap-1.5">
            {[
              { id: 'home', label: t.navHome, icon: Home },
              { id: 'portal', label: t.navPortal, icon: BookOpen }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'portal' && loggedInRole === 'Guest') {
                    handleTriggerLoginClick();
                  } else {
                    setActiveTab(tab.id as any);
                  }
                }}
                className={`flex-1 py-2 text-[11px] font-black rounded-lg text-center transition-all ${
                  activeTab === tab.id 
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs' 
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Interactive content scrollpanel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" id="dashboard-main-scroller">
          <div className="max-w-7xl mx-auto space-y-6">

            {activeTab === 'home' && (
              <PublicHome
                currentLang={currentLang}
                books={books}
                students={students}
                studyMaterials={studyMaterials}
                onLoginSuccess={handleLoginSuccess}
                isLoggedIn={loggedInRole !== 'Guest'}
                loggedInUserLabel={loggedInName}
                loggedInRole={loggedInRole}
                onLogout={handleLogout}
                onNavigatePortal={() => setActiveTab('portal')}
                isBooksLoading={isBooksLoading}
              />
            )}

            {activeTab === 'portal' && (
              <LibraryPortal
                currentRole={loggedInRole}
                loggedInStudent={loggedInStudent}
                currentLang={currentLang}
                books={books}
                students={students}
                requests={requests}
                issueLogs={issueLogs}
                auditLogs={auditLogs}
                studyMaterials={studyMaterials}
                notifications={notifications}
                onMarkNotificationRead={handleMarkNotificationRead}
                onArchiveNotification={handleArchiveNotification}
                onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                onRefreshData={refreshData}
                onAddBook={handleAddBook}
                onEditBook={handleEditBook}
                onDeleteBook={handleDeleteBook}
                onDeleteBooksBulk={handleDeleteBooksBulk}
                onClearInventory={handleClearBooksInventory}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onHoldRequest={handleHoldRequest}
                onCancelRequest={handleCancelRequest}
                onReturnBook={handleReturnBook}
                onImportBooksExcel={handleImportBooksExcel}
                onImportStudentsExcel={handleImportStudentsExcel}
                onAddStudent={handleAddStudent}
                onEditStudent={handleEditStudent}
                onDeleteStudent={handleDeleteStudent}
                onDeleteStudentsBulk={handleDeleteStudentsBulk}
                onClearStudentsRegistry={handleClearStudentsRegistry}
                onBackupDatabase={handleBackupDatabase}
                onRestoreDatabase={handleRestoreDatabase}
                onAddRequest={handleAddRequest}
                onTriggerLoginClick={handleTriggerLoginClick}
                onResetDatabase={handleResetDatabase}
                loggedInName={loggedInName}
                onUpdateLoggedInName={setLoggedInName}
                onBulkIssue={handleBulkIssue}
                onAddStudyMaterial={handleAddStudyMaterial}
                onDeleteStudyMaterial={handleDeleteStudyMaterial}
              />
            )}

          </div>
        </main>

        {/* Professional High Density Footer */}
        <footer className="h-10 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none">
          <div className="hidden sm:flex gap-4">
            <span className="font-semibold text-emerald-800">State Code: Begusarai-L01</span>
            <span>|</span>
            <span>System Status: Fully Operational</span>
          </div>
          <div>
            &copy; 2026 {t.schoolName}. All Rights Reserved.
          </div>
        </footer>

      </div>

      {/* NON-BLOCKING PROGRESS OVERLAY MODAL */}
      {importProgress.status === 'uploading' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-100 animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-400 tracking-wider">
                Syncing {importProgress.type === 'books' ? 'Books' : 'Students List'}...
              </span>
              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                {Math.round((importProgress.processed / importProgress.total) * 100)}%
              </span>
            </div>
            
            {/* Progress bar scale representation */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
              <div 
                className="h-full bg-indigo-700 dark:bg-indigo-500 transition-all duration-150"
                style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-550 dark:text-slate-400">
              <span className="font-bold">
                Uploaded {importProgress.processed.toLocaleString()} of {importProgress.total.toLocaleString()} total entries
              </span>
              <span className="animate-pulse text-indigo-750 dark:text-indigo-400 font-bold">
                Writing...
              </span>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal text-center">
              Processing rows in safety-throttled chunks to prevent catalog browser freezes. Please keep this session open.
            </p>
          </div>
        </div>
      )}


    </div>
  );
}
