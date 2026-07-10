/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PublicHome from './components/PublicHome';
import LibraryPortal from './components/LibraryPortal';
import { translations } from './localization';
import { Book, Student, BorrowRequest, BookIssueLog, UserRole, LibraryAuditLog, StudyMaterial } from './types';
import { initialBooks, initialStudents, initialRequests, initialIssueLogs } from './data/initialData';
import { Home, BookOpen, HelpCircle, LogOut, Key, Landmark } from 'lucide-react';

export default function App() {
  // --- Back-End Synced Database States ---
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [issueLogs, setIssueLogs] = useState<BookIssueLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<LibraryAuditLog[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);

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
  const refreshData = async () => {
    if (isSyncingRef.current) return;
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

      const dataBooks = await handleSafeFetch('/api/books');
      if (dataBooks) setBooks(dataBooks);

      const dataMaterials = await handleSafeFetch('/api/study-materials');
      if (dataMaterials) setStudyMaterials(dataMaterials);

      const token = localStorage.getItem("ramdiri_library_token");
      if (!token) return;

      try {
        const payloadStr = atob(token.split('.')[1]);
        const payload = JSON.parse(payloadStr);

        const headers = { 'Authorization': `Bearer ${token}` };

        if (payload.role === 'Librarian') {
          const [studentsData, requestsData, logsData, auditData, materialsData] = await Promise.all([
            handleSafeFetch('/api/students', { headers }),
            handleSafeFetch('/api/requests', { headers }),
            handleSafeFetch('/api/issue-logs', { headers }),
            handleSafeFetch('/api/audit-logs', { headers }),
            handleSafeFetch('/api/study-materials', { headers })
          ]);

          if (studentsData) setStudents(studentsData);
          if (requestsData) setRequests(requestsData);
          if (logsData) setIssueLogs(logsData);
          if (auditData) setAuditLogs(auditData);
          if (materialsData) setStudyMaterials(materialsData);
        } else if (payload.role === 'Student') {
          const [requestsData, logsData, materialsData] = await Promise.all([
            handleSafeFetch('/api/requests', { headers }),
            handleSafeFetch('/api/issue-logs', { headers }),
            handleSafeFetch('/api/study-materials', { headers })
          ]);

          if (requestsData) setRequests(requestsData);
          if (logsData) setIssueLogs(logsData);
          if (materialsData) setStudyMaterials(materialsData);
        }
      } catch (e: any) {
        console.warn("Secure metadata log synchronization gracefully deferred:", e?.message || e);
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Sync operations on mount and role transitions
  useEffect(() => {
    refreshData();
  }, [loggedInRole]);

  // Automated background retry to resolve cold-start race conditions seamlessly
  useEffect(() => {
    if (books.length > 0) return;

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
            console.log(`[DLMS AUTO-RECOVERY] Successfully resolved race condition on attempt #${retryCount}. ${freshBooks.length} books loaded.`);
            clearInterval(interval);
            return;
          }
        }
      } catch (err) {
        console.warn("[DLMS AUTO-RECOVERY] Fetch retry failed:", err);
      }

      if (retryCount >= maxRetries) {
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [books.length]);

  // Real-time synchronization poll for students and librarians (Critical Issue 5)
  useEffect(() => {
    // Poll every 3000ms to ensure real-time synchronization of state without stale data or manual refreshes
    const interval = setInterval(() => {
      refreshData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
              setLoggedInName(payload.name || "S. K. Roy (Chief Librarian)");
            } else if (payload.role === 'Student') {
              setLoggedInRole('Student');
              setLoggedInName(payload.name || "Scholar Reader");
              // Form student profile structure loaded via payload values
              const sClass = payload.class || "10";
              const sSection = payload.section || "A";
              const rNum = Number(payload.rollNumber) || 0;
              setLoggedInStudent({
                studentId: `${sClass}-${sSection}-${rNum}`,
                name: payload.name || "Student Reader",
                rollNumber: rNum,
                dob: "2010-01-01",
                class: sClass,
                section: sSection
              });
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
      let dName = "S. K. Roy (Chief Librarian)";
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
  const handleAddRequest = async (req: BorrowRequest) => {
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
      } else {
        const err = await resp.json();
        alert(`Request Denied: ${err.error}`);
      }
    } catch (err) {
      console.error("Request creation failed:", err);
    }
  };

  // 7. Approve a pending Borrow request
  const handleApproveRequest = async (id: string, dueDate?: string) => {
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
      } else {
        const err = await resp.json();
        alert(`Approval Denied: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Reject a pending borrow request
  const handleRejectRequest = async (id: string) => {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8.1 Hold a pending borrow request (Librarian)
  const handleHoldRequest = async (id: string) => {
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
      }
    } catch (err) {
      console.error(err);
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
  const handleReturnBook = async (logId: string) => {
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
      } else {
        const err = await resp.json();
        alert(`Return Check Failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
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

  // --- Dynamic Stats calculation for homepage highlights ---
  const statsSummary = {
    totalBooks: books.reduce((sum, b) => sum + b.totalCopies, 0),
    availableBooks: books.reduce((sum, b) => sum + b.availableCopies, 0),
    issuedBooks: Math.max(0, books.reduce((sum, b) => sum + (b.totalCopies - b.availableCopies), 0)),
    activeReaders: students.length
  };

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
