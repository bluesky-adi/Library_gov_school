/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Book, Student, BorrowRequest, BookIssueLog } from '../types';
import { GoogleBookCover } from './PublicHome';
import { Search, Filter, BookOpen, Clock, Calendar, CheckCircle, AlertTriangle, BookMarked, User, LayoutGrid, Table } from 'lucide-react';
import { searchBooksSmart } from '../lib/searchUtils';

interface StudentModuleProps {
  books: Book[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  loggedInStudent: Student;
  onAddRequest: (req: BorrowRequest) => void;
  onCancelRequest: (id: string) => Promise<boolean>;
  currentLang: 'EN' | 'HI';
}

export default function StudentModule({
  books,
  requests,
  issueLogs,
  loggedInStudent,
  onAddRequest,
  onCancelRequest,
  currentLang
}: StudentModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalogue' | 'profile'>('catalogue');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestingBook, setRequestingBook] = useState<Book | null>(null);
  const [requestComment, setRequestComment] = useState<string>('');

  const t = {
    EN: {
      studentPortal: "Student Reading Portal",
      welcomeBack: "Welcome back,",
      rollTag: "Roll Number:",
      dobTag: "Date of Birth:",
      classTag: "Class:",
      sectionTag: "Section:",
      searchPlaceholder: "Search book name, author, or publisher...",
      allCategories: "All Categories",
      available: "Available on Shelf",
      unavailable: "Out of Stock",
      requestBook: "Request Book",
      pending: "Pending Approval",
      approved: "Approved (Collectible)",
      rejected: "Declined",
      returned: "Returned & Shelf Restocked",
      issued: "Issued with You",
      detailsTitle: "Book Technical Specifications",
      noBooks: "No books match your criteria.",
      requestedSuccess: "Your borrow request was created successfully! Status is Pending Librarian audit.",
      alreadyRequested: "You have already submitted a pending request for this title.",
      alreadyIssued: "This book is currently issued to you.",
      bookDetails: "Book Details",
      borrowStatus: "Request Status Logs",
      activeLoansTitle: "My Currently Issued Books",
      readingHistoryTitle: "My Personal Reading History",
      copiesAvailable: "Copies Available:",
      profileTab: "My Profile Dashboard",
      catalogueTab: "Books Catalogue",
      studentBioTitle: "Student Bio Credentials",
      statsTitle: "Reading & Checkout Highlights",
      historyTableTitle: "Detailed Checking & Return History Logs",
      totReq: "Total Borrow Requested",
      totIssued: "Total Books Issued",
      totReturned: "Total Books Returned",
      totCurrent: "Currently Issued Books",
      totOverdue: "Overdue Books"
    },
    HI: {
      studentPortal: "छात्र पाठन पोर्टल",
      welcomeBack: "आपका स्वागत है,",
      rollTag: "अनुक्रमांक (Roll No):",
      dobTag: "जन्म तिथि:",
      classTag: "कक्षा (Class):",
      sectionTag: "वर्ग (Section):",
      searchPlaceholder: "पुस्तक का नाम, लेखक, या प्रकाशक खोजें...",
      allCategories: "सभी श्रेणियां",
      available: "शेल्फ पर उपलब्ध",
      unavailable: "स्टॉक में नहीं",
      requestBook: "पुस्तक का अनुरोध करें",
      pending: "लंबित (Pending)",
      approved: "स्वीकृत (प्राप्य)",
      rejected: "अस्वीकृत",
      returned: "वापस की गई (जमा कर दी गई)",
      issued: "आपके पास जारी है",
      detailsTitle: "पुस्तक तकनीकी विवरण",
      noBooks: "आपके मानदंडों के अनुरूप कोई पुस्तक नहीं मिली।",
      requestedSuccess: "आपका पुस्तक अनुरोध दर्ज कर दिया गया है! पुस्तकालयाध्यक्ष समीक्षा का इंतजार करें।",
      alreadyRequested: "आपने इस पुस्तक के लिए पहले से ही अनुरोध किया हुआ है।",
      alreadyIssued: "यह पुस्तक वर्तमान में आपके नाम पर जारी है।",
      bookDetails: "पुस्तक का विवरण",
      borrowStatus: "अनुरोध स्थिति इतिहास",
      activeLoansTitle: "मेरी वर्तमान जारी पुस्तकें",
      readingHistoryTitle: "मेरा पिछली पुस्तकों का इतिहास",
      copiesAvailable: "उपलब्ध प्रतियाँ:",
      profileTab: "मेरा प्रोफाइल डैशबोर्ड",
      catalogueTab: "पुस्तकों की सूची",
      studentBioTitle: "छात्र जैव प्रमाण-पत्र",
      statsTitle: "पाठन और चेकआउट विवरण",
      historyTableTitle: "विस्तृत पठन इतिहास तालिका",
      totReq: "कुल अनुरोधित पुस्तकें",
      totIssued: "कुल जारी पुस्तकें",
      totReturned: "कुल लौटाई गई पुस्तकें",
      totCurrent: "वर्तमान सक्रिय पुस्तकें",
      totOverdue: "अतिदेय पुस्तकें (Overdue)"
    }
  }[currentLang];

  // Helper inside loop to check if dynamic issueLog record is overdue
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

  const [studentViewMode, setStudentViewMode] = useState<'cards' | 'table'>('cards');

  // Create Category-wise Shelf Serial Map
  const categorySerialsMap = useMemo(() => {
    const map = new Map<string, number>();
    const groups: { [cat: string]: Book[] } = {};
    
    // Group books by category
    books.forEach(b => {
      const cat = b.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });

    // For each category, sort by Accession Number (and fallback to bookId) ascending
    Object.keys(groups).forEach(cat => {
      const sorted = [...groups[cat]].sort((a, b) => {
        const accA = String(a.accessionNumber || a.bookId || "").trim();
        const accB = String(b.accessionNumber || b.bookId || "").trim();
        return accA.localeCompare(accB, undefined, { numeric: true, sensitivity: 'base' });
      });
      sorted.forEach((b, idx) => {
        map.set(b.bookId, idx + 1);
      });
    });

    return map;
  }, [books]);

  // Search and Filter books catalogue with smart multi-lingual transliteration matches
  const filteredBooks = useMemo(() => {
    let result = books;
    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }
    return searchBooksSmart(result, searchTerm);
  }, [books, searchTerm, selectedCategory]);

  // Client-side pagination hooks to speed up rendering with zero freezing
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 16;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  const paginatedBooks = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredBooks.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredBooks, currentPage]);

  const bookCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(books.map(b => b.category)))];
  }, [books]);

  // Request logs specifically for the active student instance
  const studentRequests = useMemo(() => {
    return requests.filter(r => r.rollNumber === loggedInStudent.rollNumber);
  }, [requests, loggedInStudent]);

  // Active Loans for the student instance
  const studentLoans = useMemo(() => {
    return issueLogs.filter(log => log.rollNumber === loggedInStudent.rollNumber && log.status === 'Issued');
  }, [issueLogs, loggedInStudent]);

  // Reading History (completed checkouts) for the student instance
  const studentHistoryOutputFiles = useMemo(() => {
    return issueLogs.filter(log => log.rollNumber === loggedInStudent.rollNumber);
  }, [issueLogs, loggedInStudent]);

  const studentLoansReturnedOnly = useMemo(() => {
    return studentHistoryOutputFiles.filter(log => log.status === 'Returned');
  }, [studentHistoryOutputFiles]);

  const studentLoansIssuedOnly = useMemo(() => {
    return studentHistoryOutputFiles.filter(log => log.status === 'Issued');
  }, [studentHistoryOutputFiles]);

  const studentOverdueLoansList = useMemo(() => {
    return studentLoansIssuedOnly.filter(log => isOverdue(log.dueDate));
  }, [studentLoansIssuedOnly]);

  const handleRequestClick = (book: Book) => {
    if (book.availableCopies <= 0) {
      alert(currentLang === 'EN' ? "Sorry, no copies are available to borrow." : "क्षमा करें, उधार लेने के लिए कोई प्रति उपलब्ध नहीं है।");
      return;
    }

    const existingReq = requests.find(r => r.rollNumber === loggedInStudent.rollNumber && r.bookId === book.bookId && r.status === 'Pending');
    if (existingReq) {
      alert(t.alreadyRequested);
      return;
    }

    const alreadyIssued = studentLoans.some(log => log.bookId === book.bookId);
    if (alreadyIssued) {
      alert(t.alreadyIssued);
      return;
    }

    setRequestingBook(book);
    setRequestComment('');
  };

  const submitRequestWithComment = () => {
    if (!requestingBook) return;

    const newReq: BorrowRequest = {
      id: `RQ-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
      studentName: loggedInStudent.name,
      rollNumber: loggedInStudent.rollNumber,
      bookId: requestingBook.bookId,
      bookName: requestingBook.bookName,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      comment: requestComment.trim().slice(0, 200) || undefined
    };

    onAddRequest(newReq);
    setSuccessMessage(t.requestedSuccess);
    setTimeout(() => setSuccessMessage(null), 5000);
    setRequestingBook(null);
    setRequestComment('');
  };

  return (
    <div className="space-y-6" id="student-workspace-view">
      
      {/* Dynamic Overdue Notification banner at top */}
      {studentOverdueLoansList.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 p-4.5 rounded-r-xl space-y-2 shadow-xs animate-pulse">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-extrabold text-sm uppercase">
            <AlertTriangle className="w-5 h-5" />
            <span>⚠️ Critical Alert: Outstanding Overdue Return Required</span>
          </div>
          <div className="space-y-1 pl-7">
            <p className="text-xs text-red-700 dark:text-red-300">
              {currentLang === 'EN' 
                ? "Our database shows you have past-due books. Please visit Assistant Librarian S. K. Roy immediately to check-in on the following school property and restart your checking balance."
                : "हमारे डेटाबेस से पता चलता है कि आपके पास कुछ अतिदेय पुस्तकें हैं। कृपया स्कूल संपत्ति को जमा करने के लिए तुरंत सहायक पुस्तकालयाध्यक्ष एस. के. रॉय से मिलें|"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1.5">
              {studentOverdueLoansList.map(loan => (
                <div key={loan.id} className="bg-white/70 dark:bg-slate-900/40 p-2.5 rounded border border-red-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{loan.bookName}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Due Date: {loan.dueDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase block tracking-wider animate-pulse">
                      {getDaysOverdue(loan.dueDate)} Days Overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student credentials banner header block */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800 select-none">
        <div className="space-y-1">
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-extrabold tracking-wider uppercase font-mono">
            {t.studentPortal}
          </span>
          <h2 className="text-lg font-extrabold tracking-tight">
            {t.welcomeBack} {loggedInStudent.name}
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
          <div>
            <span className="opacity-75 block text-[10px] uppercase font-sans">{t.rollTag}</span>
            <span className="font-bold sm:text-sm">Class Roll #{loggedInStudent.rollNumber}</span>
          </div>
          <div className="border-l border-slate-800/60 h-8 self-center"></div>
          <div>
            <span className="opacity-75 block text-[10px] uppercase font-sans">{t.classTag}</span>
            <span className="font-bold sm:text-sm">Class {loggedInStudent.class || "10"}</span>
          </div>
          <div className="border-l border-slate-800/60 h-8 self-center"></div>
          <div>
            <span className="opacity-75 block text-[10px] uppercase font-sans">{t.sectionTag}</span>
            <span className="font-bold sm:text-sm">Section {loggedInStudent.section || "A"}</span>
          </div>
          <div className="border-l border-slate-800/60 h-8 self-center"></div>
          <div>
            <span className="opacity-75 block text-[10px] uppercase font-sans">{t.dobTag}</span>
            <span className="font-bold sm:text-sm">{loggedInStudent.dob}</span>
          </div>
        </div>
      </div>

      {/* Elegant sub-nav tab switcher for Student Portal */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('catalogue')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wide uppercase border-b-2 transition-all ${
            activeSubTab === 'catalogue'
              ? 'border-slate-850 text-slate-900 dark:text-slate-100 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          📖 {t.catalogueTab}
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wide uppercase border-b-2 transition-all ${
            activeSubTab === 'profile'
              ? 'border-slate-850 text-slate-900 dark:text-slate-100 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          👤 {t.profileTab}
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-amber-50 dark:bg-slate-800 border border-amber-200 rounded-lg text-xs text-slate-800 dark:text-slate-400 flex items-center gap-2.5 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Conditionally render workspace panels */}
      {activeSubTab === 'catalogue' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Books Catalogue Segment (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Search and control dashboard row */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col gap-3 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={currentLang === 'EN' ? "🔍 Search english/हिन्दी/hinglish terms (e.g., vigyan, ganit)..." : "हिंदी / अंग्रेजी संकलन खोजें..."}
                    className="w-full text-xs font-bold text-slate-900 dark:text-white pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-350 focus:border-slate-900 rounded-lg outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="All">{t[currentLang].allCategories}</option>
                    {['All', 'Hindi Literature', 'English Literature', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'General Knowledge', 'Reference books'].filter(cat => cat !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Layout view controls & status info */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
                <span className="text-xs font-extrabold text-slate-700 font-mono">
                  Showing {filteredBooks.length} / {books.length} Books
                </span>
                <span className="text-[10px] bg-[#0f172a] text-amber-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  📖 SCHOOL DATABASE
                </span>
              </div>
            </div>

            {/* Content Display: Cards Grid */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-12 p-4 text-slate-500 bg-white border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-extrabold">{t[currentLang].noBooks}</p>
              </div>
            ) : (
              <div>
                /* RENDER HIGH CONTRAST SIMPLIFIED GRID CARDS FOR STUDENTS */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedBooks.map(book => {
                  const isAvailable = book.availableCopies > 0;
                  return (
                    <div 
                      key={book.bookId}
                      className="bg-white dark:bg-slate-900 border-2 border-slate-205 dark:border-slate-800 rounded-xl p-4 flex gap-4 hover:border-slate-400 dark:hover:border-slate-600 shadow-xs transition-all"
                    >
                      <div className="w-24 shrink-0">
                        <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] bg-indigo-50 dark:bg-slate-800 text-indigo-850 dark:text-slate-200 px-2 py-0.5 rounded font-black uppercase">
                              {book.category}
                            </span>
                          </div>
                          
                          <h3 className="font-extrabold text-[#0f172a] dark:text-slate-100 text-xs sm:text-sm line-clamp-2">
                            {book.bookName}
                          </h3>
                          <p className="text-[11px] text-slate-600 dark:text-slate-450 italic font-medium line-clamp-1">
                            by {book.author}
                          </p>
                          
                          <div className="pt-2 flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-red-650'}`}></span>
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-350">
                              {isAvailable ? `${t[currentLang].copiesAvailable} ${book.availableCopies} / ${book.totalCopies}` : t[currentLang].unavailable}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-2.5 border-t border-slate-150 dark:border-slate-800 mt-2">
                          <button
                            onClick={() => setSelectedBook(book)}
                            className="px-2.5 py-1.5 border-2 border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10.5px] font-bold text-slate-755 dark:text-slate-300 rounded transition-all cursor-pointer"
                          >
                            {t[currentLang].bookDetails}
                          </button>
                          <button
                            onClick={() => handleRequestClick(book)}
                            disabled={!isAvailable}
                            className={`flex-1 px-2.5 py-1.5 text-[10.5px] font-black rounded border-2 transition-all cursor-pointer text-center ${
                              isAvailable
                                ? 'bg-[#0f172a] hover:bg-slate-800 text-white border-[#0f172a] shadow-xs'
                                : 'bg-slate-100 text-slate-400 border-slate-205 cursor-not-allowed'
                            }`}
                          >
                            {t[currentLang].requestBook}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-250 dark:border-slate-800 pt-4 mt-4 gap-4">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    Page {currentPage} of {totalPages} ({filteredBooks.length} books total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3.5 py-1.5 border-2 border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none select-none transition-colors text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      ◀ Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        if (pageNum < 1 || pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-mono font-bold border-2 transition-colors cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md'
                                : 'bg-white border-slate-200 hover:bg-slate-55 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3.5 py-1.5 border-2 border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none select-none transition-colors text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Request Status Logs & Reading History Segment (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Active Loans */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-3 shadow-xs">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <BookMarked className="w-4 h-4 text-slate-700 font-bold" />
                <span>{t.activeLoansTitle}</span>
              </h3>
              <div className="divide-y divide-slate-150">
                {studentLoans.map(loan => (
                  <div key={loan.id} className="py-2.5 flex justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{loan.bookName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block text-red-500 font-bold">Due: {loan.dueDate}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block ${
                        isOverdue(loan.dueDate)
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}>
                        {isOverdue(loan.dueDate) ? "OVERDUE" : t.issued}
                      </span>
                      <span className="text-[9px] text-slate-400 block pt-0.5 font-mono">Issued: {loan.issueDate}</span>
                    </div>
                  </div>
                ))}
                {studentLoans.length === 0 && (
                  <p className="py-4 text-center text-slate-400 text-xs">You have 0 currently issued books.</p>
                )}
              </div>
            </div>

            {/* Borrow status logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
              <h3 className="text-xs font-black uppercase text-[#0f172a] tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-amber-500 font-bold" />
                <span>My Requests & Status</span>
              </h3>

              <div className="divide-y divide-slate-150 max-h-96 overflow-y-auto space-y-2">
                {studentRequests.map(req => {
                  // Find if there is a corresponding issue log for this book to get due date if issued
                  const relatedIssue = issueLogs.find(log => log.rollNumber === loggedInStudent.rollNumber && log.bookId === req.bookId && log.status === 'Issued');
                  return (
                    <div key={req.id} className="py-2.5 flex flex-col gap-2 text-xs border-b border-slate-100 last:border-0 font-sans">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-extrabold text-[#0f172a] dark:text-slate-100 block">{req.bookName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 font-bold">Requested on: {req.requestDate}</span>
                          {relatedIssue && (
                            <span className="text-[10px] text-red-650 font-black block mt-1 font-mono">
                              ⚠️ RETURN BY DUE DATE: {relatedIssue.dueDate}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 border rounded font-black uppercase tracking-wide inline-block ${
                            req.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-805 border-emerald-200'
                              : req.status === 'Cancelled'
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-red-105 text-red-800 border-red-200'
                          }`}>
                            {req.status === 'Pending' ? t[currentLang].pending : req.status === 'Approved' ? t[currentLang].approved : req.status === 'Cancelled' ? "Cancelled" : t[currentLang].rejected}
                          </span>
                        </div>
                      </div>

                      {/* Display Cancel Request button if request is Pending */}
                      {req.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(currentLang === 'EN' ? "Cancel this borrow request?" : "क्या आप इस अनुरोध को रद्द करना चाहते हैं?")) {
                              onCancelRequest(req.id);
                            }
                          }}
                          className="w-full text-center py-1.5 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10px] rounded uppercase tracking-wider select-none cursor-pointer transition-all border border-transparent shadow-xs"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  );
                })}

                {studentRequests.length === 0 && (
                  <p className="py-4 text-center text-slate-400 text-xs">Your pending requests list is empty.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Detailed Student Profile Page/Tab */
        <div className="space-y-6 animate-fade-in" id="student-profile-detailed-tab">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* 1. Student Bio Coordinates */}
            <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5.5 h-5.5 text-slate-755" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm select-none">
                    {t.studentBioTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400">Class Credentials Verification</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 uppercase font-sans font-bold select-none">Full Name</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-200">{loggedInStudent.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 uppercase font-sans font-bold select-none">Class Roll Call Number</span>
                  <span className="font-extrabold text-amber-600">Roll #{loggedInStudent.rollNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 uppercase font-sans font-bold select-none">Assigned Academic Class</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-250">Grade {loggedInStudent.class || "10"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 uppercase font-sans font-bold select-none">Academic Section Code</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-250">Section {loggedInStudent.section || "A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-450 uppercase font-sans font-bold select-none">Official Date of Birth</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-250">{loggedInStudent.dob}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-455 uppercase font-sans font-bold select-none">Verification Signatures</span>
                  <span className="text-emerald-700 font-extrabold uppercase font-sans">School Register Verified ✅</span>
                </div>
              </div>
            </div>

            {/* 2. Highlights Ratios Metrics Cards */}
            <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm select-none pb-2.5 border-b border-slate-100">
                📊 {t.statsTitle}
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#fcfdfc] p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totReq}</span>
                  <span className="text-xl font-black text-slate-900 block">{studentRequests.length}</span>
                </div>
                <div className="bg-[#fcfdfc] p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totIssued}</span>
                  <span className="text-xl font-black text-slate-900 block">{studentHistoryOutputFiles.length}</span>
                </div>
                <div className="bg-[#fcfdfc] p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totReturned}</span>
                  <span className="text-xl font-black text-emerald-600 block">{studentLoansReturnedOnly.length}</span>
                </div>
                <div className="bg-[#fcfdfc] p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totCurrent}</span>
                  <span className="text-xl font-black text-amber-600 block">{studentLoansIssuedOnly.length}</span>
                </div>
                <div className="bg-[#fcfdfc] p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totOverdue}</span>
                  <span className="text-xl font-black text-red-655 block">{studentOverdueLoansList.length}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Detailed Checking History Table Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm select-none">
              📁 {t.historyTableTitle}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 text-slate-400 select-none">
                    <th className="p-3 uppercase font-extrabold">Book Title</th>
                    <th className="p-3 uppercase font-extrabold">Issue Date</th>
                    <th className="p-3 uppercase font-extrabold">Due Date</th>
                    <th className="p-3 uppercase font-extrabold">Return Date</th>
                    <th className="p-3 uppercase font-extrabold">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentHistoryOutputFiles.map(log => {
                    const overdueActive = log.status === 'Issued' && isOverdue(log.dueDate);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-all font-mono">
                        <td className="p-3 font-bold font-sans text-slate-900 dark:text-slate-100">{log.bookName}</td>
                        <td className="p-3 text-slate-655">{log.issueDate}</td>
                        <td className="p-3 text-red-500 font-bold">{log.dueDate}</td>
                        <td className="p-3">{log.returnDate || <span className="opacity-40 italic font-sans">Outstanding</span>}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase font-sans inline-block border ${
                            log.status === 'Returned'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                              : overdueActive
                              ? 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                              : 'bg-amber-50 text-amber-850 border-amber-200'
                          }`}>
                            {log.status === 'Returned' ? "Returned" : overdueActive ? "Overdue return required!" : "Issued"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {studentHistoryOutputFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-sans">
                        No checked logs available inside your personal school index catalog histories.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* DETAILED BOOK DIALOG MODAL */}
      {selectedBook && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider">{t.bookDetails}</span>
              <button 
                onClick={() => setSelectedBook(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex gap-5 flex-col sm:flex-row max-h-[75vh] overflow-y-auto">
              <div className="w-28 mx-auto sm:mx-0 shrink-0">
                <GoogleBookCover bookName={selectedBook.bookName} author={selectedBook.author} coverImage={selectedBook.coverImage} />
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] bg-sky-50 text-sky-850 px-2 py-0.5 rounded font-bold uppercase">
                    {selectedBook.category}
                  </span>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                    {selectedBook.bookName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    by <span className="font-bold text-slate-700">{selectedBook.author}</span>
                  </p>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 p-3 rounded border leading-relaxed">
                  {selectedBook.description}
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px] border-t border-slate-150 pt-3">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wide font-mono">Category</span>
                    <span className="font-bold text-[#0f172a] dark:text-indigo-400 block mt-0.5">{selectedBook.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wide font-mono">Availability State</span>
                    <span className={`font-extrabold block mt-0.5 ${selectedBook.availableCopies > 0 ? 'text-emerald-700 font-bold' : 'text-red-655'}`}>
                      {selectedBook.availableCopies > 0 ? `${t[currentLang].available} (${selectedBook.availableCopies} Copies)` : t[currentLang].unavailable}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleRequestClick(selectedBook);
                    setSelectedBook(null);
                  }}
                  disabled={selectedBook.availableCopies <= 0}
                  className={`w-full p-2.5 font-bold text-xs rounded transition-all cursor-pointer text-center block ${
                    selectedBook.availableCopies > 0
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t.requestBook}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* REQUEST COMMENT DIALOG */}
      {requestingBook && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[999] font-sans" id="request-comment-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="bg-[#0f172a] text-amber-400 p-4 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider">✍️ Customize Borrow Request</span>
              <button 
                onClick={() => setRequestingBook(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-slate-900 dark:text-slate-100">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-205 dark:border-slate-850 text-slate-900 dark:text-slate-100">
                <span className="text-[9px] bg-indigo-50 text-indigo-850 px-2 py-0.5 rounded font-bold uppercase block w-max mb-1">
                  {requestingBook.category}
                </span>
                <h4 className="font-extrabold text-sm text-[#0f172a] dark:text-slate-100 leading-snug">
                  {requestingBook.bookName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  by <span className="font-bold text-slate-700">{requestingBook.author}</span>
                </p>
              </div>

              <div className="space-y-1.5 text-slate-900 dark:text-slate-100">
                <label className="text-[11px] font-black text-slate-500 uppercase block">
                  {currentLang === 'EN' ? "Borrow Comment (Optional - max 200 chars)" : "अनुरोध संदेश / टिप्पणी (वैकल्पिक - अधिकतम 200 शब्द)"}
                </label>
                <textarea
                  maxLength={200}
                  value={requestComment}
                  onChange={(e) => setRequestComment(e.target.value)}
                  placeholder={currentLang === 'EN' 
                    ? "e.g., I will need this book for 25 days to prepare for science exams." 
                    : "उदा. मुझे विज्ञान परीक्षा की तैयारी के लिए यह पुस्तक 25 दिनों के लिए चाहिए।"
                  }
                  className="w-full text-xs font-bold text-slate-900 dark:text-white p-3 bg-slate-50 border border-slate-350 focus:border-[#0f172a] rounded-lg outline-none min-h-[90px] h-[90px] resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                  <span>{currentLang === 'EN' ? "Use to justify period or return needs" : "अवधि या पाठन उद्देश्यों को स्पष्ट करें"}</span>
                  <span className={requestComment.length >= 180 ? "text-amber-600 font-black" : ""}>
                    {requestComment.length}/200
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-205 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setRequestingBook(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs text-slate-705 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
              >
                {currentLang === 'EN' ? "Cancel" : "रद्द करें"}
              </button>
              <button
                type="button"
                onClick={submitRequestWithComment}
                className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-black text-xs rounded-lg transition-all cursor-pointer"
              >
                {currentLang === 'EN' ? "Submit Borrow Request" : "अनुरोध सबमिट करें"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
