/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import PublicHome from './components/PublicHome';
import LibraryPortal from './components/LibraryPortal';
import PRD_Architecture from './components/PRD_Architecture';
import { translations } from './localization';
import { Book, Student, BorrowRequest, BookIssueLog, UserRole } from './types';
import { initialBooks, initialStudents, initialRequests, initialIssueLogs } from './data/initialData';
import { Home, BookOpen, HelpCircle, LogOut, Key, Landmark } from 'lucide-react';

export default function App() {
  // --- Back-End Synced Database States ---
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [issueLogs, setIssueLogs] = useState<BookIssueLog[]>([]);

  // --- Dynamic Layout Configuration States ---
  const [currentLang, setCurrentLang] = useState<'EN' | 'HI'>('EN');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [fontSizeLarge, setFontSizeLarge] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'portal' | 'docs'>('home');

  // --- Secure Session Authentication States ---
  const [loggedInRole, setLoggedInRole] = useState<UserRole | 'Guest'>('Guest');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  const [loggedInName, setLoggedInName] = useState<string>('');

  const t = translations[currentLang];

  // Refresh all system metrics and records from servers safely
  const refreshData = async () => {
    try {
      // Books is public
      const resBooks = await fetch('/api/books');
      if (resBooks.ok) {
        const dataBooks = await resBooks.json();
        setBooks(dataBooks);
      }
    } catch (err) {
      console.error("Failed to load public catalogs:", err);
    }

    const token = localStorage.getItem("ramdiri_library_token");
    if (!token) return;

    try {
      const payloadStr = atob(token.split('.')[1]);
      const payload = JSON.parse(payloadStr);

      const headers = { 'Authorization': `Bearer ${token}` };

      if (payload.role === 'Librarian') {
        const [resStudents, resRequests, resLogs] = await Promise.all([
          fetch('/api/students', { headers }),
          fetch('/api/requests', { headers }),
          fetch('/api/issue-logs', { headers })
        ]);

        if (resStudents.ok) setStudents(await resStudents.json());
        if (resRequests.ok) setRequests(await resRequests.json());
        if (resLogs.ok) setIssueLogs(await resLogs.json());
      } else if (payload.role === 'Student') {
        const [resRequests, resLogs] = await Promise.all([
          fetch('/api/requests', { headers }),
          fetch('/api/issue-logs', { headers })
        ]);

        if (resRequests.ok) setRequests(await resRequests.json());
        if (resLogs.ok) setIssueLogs(await resLogs.json());
      }
    } catch (e) {
      console.error("Failed to sync secure database logs:", e);
    }
  };

  // Sync operations on mount and role transitions
  useEffect(() => {
    refreshData();
  }, [loggedInRole]);

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
              setLoggedInName("S. K. Roy (Chief Librarian)");
            } else if (payload.role === 'Student') {
              setLoggedInRole('Student');
              setLoggedInName(payload.name || "Scholar Reader");
              // Form student profile structure loaded via payload values
              setLoggedInStudent({
                name: payload.name || "Student Reader",
                rollNumber: payload.rollNumber || 0,
                dob: "2010-01-01",
                class: payload.class || "10",
                section: payload.section || "A"
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

  // Update dynamic logged-in student profile if student database changes
  useEffect(() => {
    if (loggedInRole === 'Student' && loggedInStudent) {
      const live = students.find(s => s.rollNumber === loggedInStudent.rollNumber);
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
      setLoggedInName("S. K. Roy (Chief Librarian)");
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

  // 4. Excel Bulk Import Books
  const handleImportBooksExcel = async (imported: Book[]) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      for (const book of imported) {
        await fetch('/api/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(book)
        });
      }
      await refreshData();
    } catch (err) {
      console.error("Bulk books import triggered error:", err);
    }
  };

  // 5. Excel Bulk Import Students
  const handleImportStudentsExcel = async (imported: Student[]) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students: imported })
      });
      if (resp.ok) {
        await refreshData();
      } else {
        const err = await resp.json();
        alert(`Bulk Import Failure: ${err.error}`);
      }
    } catch (err) {
      console.error("Bulk student import triggered error:", err);
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
  const handleApproveRequest = async (id: string) => {
    const token = localStorage.getItem("ramdiri_library_token");
    try {
      const resp = await fetch(`/api/requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      className={`min-h-screen flex flex-col md:flex-row transition-all ${
        highContrast 
          ? 'bg-slate-950 text-white selection:bg-yellow-400 selection:text-slate-950 font-sans' 
          : 'bg-[#f4f7f5] text-slate-800 font-sans'
      } ${
        fontSizeLarge ? 'text-lg' : 'text-sm'
      }`}
      id="root-viewport-container"
    >
      
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
            { id: 'portal', label: t.navPortal, icon: BookOpen },
            { id: 'docs', label: currentLang === 'EN' ? "User Manual" : "उपयोगकर्ता नियमावली", icon: HelpCircle }
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
          highContrast={highContrast}
          onContrastToggle={() => setHighContrast(!highContrast)}
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
              { id: 'portal', label: t.navPortal, icon: BookOpen },
              { id: 'docs', label: currentLang === 'EN' ? "Manual" : "नियमावली", icon: HelpCircle }
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
                onLoginSuccess={handleLoginSuccess}
                isLoggedIn={loggedInRole !== 'Guest'}
                loggedInUserLabel={loggedInName}
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
                onAddBook={handleAddBook}
                onEditBook={handleEditBook}
                onDeleteBook={handleDeleteBook}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onReturnBook={handleReturnBook}
                onImportBooksExcel={handleImportBooksExcel}
                onImportStudentsExcel={handleImportStudentsExcel}
                onAddRequest={handleAddRequest}
                onTriggerLoginClick={handleTriggerLoginClick}
                onResetDatabase={handleResetDatabase}
              />
            )}

            {activeTab === 'docs' && (
              <PRD_Architecture />
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

    </div>
  );
}
