/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Book, Student, BorrowRequest, BookIssueLog, StudyMaterial } from '../types';
import { GoogleBookCover } from './PublicHome';
import { Search, Filter, BookOpen, Clock, Calendar, CheckCircle, AlertTriangle, BookMarked, User, LayoutGrid, Table, Star, Send, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { searchBooksSmart } from '../lib/searchUtils';

interface InfiniteScrollSentinelProps {
  onVisible: () => void;
  hasMore: boolean;
}

function InfiniteScrollSentinel({ onVisible, hasMore }: InfiniteScrollSentinelProps) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onVisible();
      }
    }, {
      rootMargin: '200px',
    });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onVisible, hasMore]);

  if (!hasMore) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 font-mono select-none border-t border-slate-100 dark:border-slate-800 mt-4">
        ✓ Loaded all books in school library catalogue
      </div>
    );
  }

  return (
    <div 
      ref={sentinelRef} 
      className="py-8 flex items-center justify-center gap-2 text-xs text-indigo-600 font-mono select-none animate-pulse border-t border-slate-100 dark:border-slate-800 mt-4"
    >
      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
      <span>Browsing dynamic shelf stacks...</span>
    </div>
  );
}

interface StudentModuleProps {
  books: Book[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  loggedInStudent: Student;
  studyMaterials?: StudyMaterial[];
  onAddRequest: (req: BorrowRequest) => Promise<{ success: boolean; error?: string }>;
  onCancelRequest: (id: string) => Promise<boolean>;
  currentLang: 'EN' | 'HI';
}

export default function StudentModule({
  books: rawBooks = [],
  requests: rawRequests = [],
  issueLogs: rawIssueLogs = [],
  loggedInStudent,
  studyMaterials = [],
  onAddRequest,
  onCancelRequest,
  currentLang
}: StudentModuleProps) {
  const books = Array.isArray(rawBooks) ? rawBooks : [];
  const requests = Array.isArray(rawRequests) ? rawRequests : [];
  const issueLogs = Array.isArray(rawIssueLogs) ? rawIssueLogs : [];

  const [activeSubTab, setActiveSubTab] = useState<'catalogue' | 'profile' | 'study-materials' | 'contact-librarian'>('catalogue');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestingBook, setRequestingBook] = useState<Book | null>(null);
  const [requestComment, setRequestComment] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);

  // Student Feedback States inside StudentModule Dashboard
  const [myReview, setMyReview] = useState<any | null>(null);
  const [myReviewLoading, setMyReviewLoading] = useState<boolean>(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, type: 'General', comment: '' });
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

  // Contact Librarian States & Functions
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [contactMessagesLoading, setContactMessagesLoading] = useState<boolean>(false);
  const [contactForm, setContactForm] = useState({ category: 'General Question', message: '' });
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSubmitting, setContactSubmitting] = useState<boolean>(false);

  const fetchContactMessages = () => {
    setContactMessagesLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");
    fetch('/api/contact-messages', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setContactMessages(data);
        }
      })
      .catch(err => console.error("Error loading contact messages:", err))
      .finally(() => setContactMessagesLoading(false));
  };

  React.useEffect(() => {
    if (activeSubTab === 'contact-librarian') {
      fetchContactMessages();
    }
  }, [activeSubTab]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.message.trim()) {
      setContactError("Please write a message.");
      return;
    }
    setContactSubmitting(true);
    setContactSuccess(null);
    setContactError(null);

    const token = localStorage.getItem("ramdiri_library_token");
    fetch('/api/contact-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(contactForm)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit message.");
        }
        setContactSuccess("Your message was successfully sent to the Librarian!");
        setContactForm({ category: 'General Question', message: '' });
        fetchContactMessages();
      })
      .catch(err => {
        setContactError(err.message || "Error sending message.");
      })
      .finally(() => {
        setContactSubmitting(false);
      });
  };

  const fetchMyReview = () => {
    setMyReviewLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");
    fetch('/api/feedback/my-review', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.feedback) {
          setMyReview(data.feedback);
          setFeedbackForm({
            rating: data.feedback.rating || 5,
            type: data.feedback.type || 'General',
            comment: data.feedback.comment || ''
          });
        } else {
          setMyReview(null);
        }
      })
      .catch(err => console.error("Error loading my-review inside student panel:", err))
      .finally(() => setMyReviewLoading(false));
  };

  // Fetch student review on mount and when active tab changes to profile
  React.useEffect(() => {
    if (activeSubTab === 'profile') {
      fetchMyReview();
    }
  }, [activeSubTab]);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.comment.trim()) {
      setFeedbackError("Please provide some feedback comments.");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const token = localStorage.getItem("ramdiri_library_token");
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        ...feedbackForm,
        name: loggedInStudent?.name || "Student",
        role: "Student"
      })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit feedback.");
        }
        setFeedbackSuccess("Your feedback/suggestion was successfully saved in the database!");
        if (data.moderation?.classification === 'SPAM_OR_ABUSE') {
          setFeedbackSuccess(`Auto-moderated classification flag: potentially spam (Reason: ${data.moderation.reason}). Submitting for Librarian check.`);
        }
        fetchMyReview();
      })
      .catch(err => {
        setFeedbackError(err.message || "Network error submitting feedback.");
      })
      .finally(() => {
        setFeedbackSubmitting(false);
      });
  };

  const translations = {
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
      studyMaterialsTab: "Study Notes",
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
      studyMaterialsTab: "अध्ययन नोट्स",
      studentBioTitle: "छात्र जैव प्रमाण-पत्र",
      statsTitle: "पाठन और चेकआउट विवरण",
      historyTableTitle: "विस्तृत पठन इतिहास तालिका",
      totReq: "कुल अनुरोधित पुस्तकें",
      totIssued: "कुल जारी पुस्तकें",
      totReturned: "कुल लौटाई गई पुस्तकें",
      totCurrent: "वर्तमान सक्रिय पुस्तकें",
      totOverdue: "अतिदेय पुस्तकें (Overdue)"
    }
  };

  const langKey = (currentLang && currentLang.toUpperCase() === 'HI') ? 'HI' : 'EN';
  const t = translations[langKey] || translations.EN;


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
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [bookLanguageFilter, setBookLanguageFilter] = useState<string>('all');
  const [sortByFilter, setSortByFilter] = useState<string>('relevance');

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
    let result = [...books];
    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }
    if (availabilityFilter === 'available') {
      result = result.filter(b => b.availableCopies > 0);
    } else if (availabilityFilter === 'outofstock') {
      result = result.filter(b => b.availableCopies === 0);
    }
    if (bookLanguageFilter === 'hindi') {
      result = result.filter(b => /[\u0900-\u097F]/.test(b.bookName || b.author || ""));
    } else if (bookLanguageFilter === 'english') {
      result = result.filter(b => !/[\u0900-\u097F]/.test(b.bookName || b.author || ""));
    }
    if (searchTerm) {
      result = searchBooksSmart(result, searchTerm, categorySerialsMap);
    }
    if (sortByFilter === 'title-asc') {
      result.sort((a, b) => (a.bookName || "").localeCompare(b.bookName || "", undefined, { sensitivity: 'base' }));
    } else if (sortByFilter === 'title-desc') {
      result.sort((a, b) => (b.bookName || "").localeCompare(a.bookName || "", undefined, { sensitivity: 'base' }));
    } else if (sortByFilter === 'ddc-asc') {
      result.sort((a, b) => {
        const ddcA = String(a.ddcNumber || a.callNumber || "").trim();
        const ddcB = String(b.ddcNumber || b.callNumber || "").trim();
        return ddcA.localeCompare(ddcB, undefined, { numeric: true });
      });
    } else if (sortByFilter === 'copies-desc') {
      result.sort((a, b) => (b.availableCopies || 0) - (a.availableCopies || 0));
    } else {
      result.sort((a, b) => {
        const idA = parseInt(a.bookId.replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(b.bookId.replace(/\D/g, ''), 10) || 0;
        if (idA !== idB) return idA - idB;
        return a.bookId.localeCompare(b.bookId, undefined, { numeric: true });
      });
    }
    return result;
  }, [books, searchTerm, selectedCategory, availabilityFilter, bookLanguageFilter, sortByFilter]);

  // Infinite scroll book count state
  const [visibleBooksCount, setVisibleBooksCount] = useState<number>(24);

  React.useEffect(() => {
    setVisibleBooksCount(24);
  }, [searchTerm, selectedCategory, availabilityFilter, bookLanguageFilter, sortByFilter]);

  const paginatedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleBooksCount);
  }, [filteredBooks, visibleBooksCount]);

  const bookCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(books.map(b => b.category)))];
  }, [books]);

  // Request logs specifically for the active student instance
  const studentRequests = useMemo(() => {
    const sId = loggedInStudent.studentId || `${loggedInStudent.class}-${loggedInStudent.section}-${loggedInStudent.rollNumber}`;
    return requests.filter(r => {
      const rId = r.studentId || (r.class && r.section ? `${r.class}-${r.section}-${r.rollNumber}` : null);
      if (rId) return rId.toUpperCase() === sId.toUpperCase();
      return r.rollNumber === loggedInStudent.rollNumber && r.studentName === loggedInStudent.name;
    });
  }, [requests, loggedInStudent]);

  // Active Loans for the student instance
  const studentLoans = useMemo(() => {
    const sId = loggedInStudent.studentId || `${loggedInStudent.class}-${loggedInStudent.section}-${loggedInStudent.rollNumber}`;
    return issueLogs.filter(log => {
      const logSId = log.studentId || (log.class && log.section ? `${log.class}-${log.section}-${log.rollNumber}` : null);
      const isMyLog = logSId ? logSId.toUpperCase() === sId.toUpperCase() : (log.rollNumber === loggedInStudent.rollNumber && log.studentName === loggedInStudent.name);
      return isMyLog && log.status === 'Issued';
    });
  }, [issueLogs, loggedInStudent]);

  // Reading History (completed checkouts) for the student instance
  const studentHistoryOutputFiles = useMemo(() => {
    const sId = loggedInStudent.studentId || `${loggedInStudent.class}-${loggedInStudent.section}-${loggedInStudent.rollNumber}`;
    return issueLogs.filter(log => {
      const logSId = log.studentId || (log.class && log.section ? `${log.class}-${log.section}-${log.rollNumber}` : null);
      return logSId ? logSId.toUpperCase() === sId.toUpperCase() : (log.rollNumber === loggedInStudent.rollNumber && log.studentName === loggedInStudent.name);
    });
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

  const submitRequestWithComment = async () => {
    if (!requestingBook || isSubmittingRequest) return;

    setIsSubmittingRequest(true);
    const newReq: BorrowRequest = {
      id: `RQ-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
      studentName: loggedInStudent.name,
      rollNumber: loggedInStudent.rollNumber,
      class: loggedInStudent.class,
      section: loggedInStudent.section,
      studentId: loggedInStudent.studentId || `${loggedInStudent.class}-${loggedInStudent.section}-${loggedInStudent.rollNumber}`,
      bookId: requestingBook.bookId,
      bookName: requestingBook.bookName,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      comment: requestComment.trim().slice(0, 200) || undefined
    };

    const result = await onAddRequest(newReq);
    setIsSubmittingRequest(false);
    if (result && result.success) {
      setSuccessMessage(t.requestedSuccess);
      setTimeout(() => setSuccessMessage(null), 5000);
      setRequestingBook(null);
      setRequestComment('');
    } else {
      alert(currentLang === 'EN' 
        ? `Error submitting request: ${result?.error || "Unknown server error"}`
        : `अनुरोध सबमिट करने में विफलता: ${result?.error || "अंतिम डेटाबेस त्रुटि"}`
      );
    }
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
                ? "Our database shows you have past-due books. Please visit the Librarian immediately to check-in on the following school property and restart your checking balance."
                : "हमारे डेटाबेस से पता चलता है कि आपके पास कुछ अतिदेय पुस्तकें हैं। कृपया स्कूल संपत्ति को जमा करने के लिए तुरंत पुस्तकालयाध्यक्ष से मिलें|"}
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
          onClick={() => setActiveSubTab('study-materials')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wide uppercase border-b-2 transition-all ${
            activeSubTab === 'study-materials'
              ? 'border-slate-850 text-slate-900 dark:text-slate-100 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          📂 {t.studyMaterialsTab || "Study Notes"}
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
        <button
          onClick={() => setActiveSubTab('contact-librarian')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wide uppercase border-b-2 transition-all ${
            activeSubTab === 'contact-librarian'
              ? 'border-slate-850 text-slate-900 dark:text-slate-100 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          💬 {currentLang === 'EN' ? "Contact Librarian" : "पुस्तकालयाध्यक्ष संपर्क"}
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
                    className="w-full text-xs font-bold text-slate-900 dark:text-white pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-800 focus:border-slate-900 dark:focus:border-indigo-500 rounded-lg outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs font-bold p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-650"
                  >
                    <option value="All">{t.allCategories}</option>
                    {bookCategories.filter(cat => cat !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Filters Segment (Availability, Language, Sort By) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3" id="student-catalog-combined-filters">
                {/* Availability Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    {currentLang === 'EN' ? "Availability" : "उपलब्धता"}
                  </label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-650 cursor-pointer"
                  >
                    <option value="all">{currentLang === 'EN' ? "All Books" : "सभी पुस्तकें"}</option>
                    <option value="available">{currentLang === 'EN' ? "Available on Shelf" : "शेल्फ पर उपलब्ध"}</option>
                    <option value="outofstock">{currentLang === 'EN' ? "All Issued / Out of Stock" : "सभी जारी / स्टॉक में नहीं"}</option>
                  </select>
                </div>

                {/* Book Language Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    {currentLang === 'EN' ? "Book Medium / Script" : "पुस्तक माध्यम / लिपि"}
                  </label>
                  <select
                    value={bookLanguageFilter}
                    onChange={(e) => setBookLanguageFilter(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-655 cursor-pointer"
                  >
                    <option value="all">{currentLang === 'EN' ? "All Media" : "सभी माध्यम"}</option>
                    <option value="hindi">{currentLang === 'EN' ? "Hindi Medium / हिंदी" : "हिंदी माध्यम / देवनागरी"}</option>
                    <option value="english">{currentLang === 'EN' ? "English Medium / CBSE" : "अंग्रेजी माध्यम"}</option>
                  </select>
                </div>

                {/* Sorting */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    {currentLang === 'EN' ? "Sort Catalogue By" : "क्रमबद्ध करें"}
                  </label>
                  <select
                    value={sortByFilter}
                    onChange={(e) => setSortByFilter(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-660 cursor-pointer"
                  >
                    <option value="relevance">{currentLang === 'EN' ? "Relevance / Shelf Serial" : "प्रासंगिकता / शेल्फ क्रमांक"}</option>
                    <option value="title-asc">{currentLang === 'EN' ? "Title (A to Z)" : "शीर्षक (A से Z)"}</option>
                    <option value="title-desc">{currentLang === 'EN' ? "Title (Z to A)" : "शीर्षक (Z से A)"}</option>
                    <option value="ddc-asc">{currentLang === 'EN' ? "DDC Call Number" : "DDC कॉल नंबर"}</option>
                    <option value="copies-desc">{currentLang === 'EN' ? "Highest Available Copies" : "अधिकतम उपलब्ध प्रतियां"}</option>
                  </select>
                </div>
              </div>

              {/* Layout view controls & status info */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                <span className="text-xs font-extrabold text-slate-705 dark:text-slate-300 font-mono">
                  Showing {filteredBooks.length} / {books.length} Books
                </span>
                <span className="text-[10px] bg-[#0f172a] text-amber-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  📖 SCHOOL DATABASE
                </span>
              </div>
            </div>

            {/* Content Display: Cards Grid */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-12 p-4 text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-extrabold">{t.noBooks}</p>
              </div>
            ) : (
              <div>
                {/* RENDER HIGH CONTRAST SIMPLIFIED GRID CARDS FOR STUDENTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedBooks.map(book => {
                    const isAvailable = book.availableCopies > 0;
                    return (
                      <div 
                        key={book.bookId}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 shadow-xs hover:shadow-md transition-all duration-300"
                      >
                        <div 
                          onClick={() => setSelectedBook(book)}
                          className="aspect-[3/4] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 rounded-md ring-1 ring-slate-100 dark:ring-slate-800 hover:scale-[1.02] transition-all duration-300 cursor-pointer flex items-center justify-center"
                        >
                          <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between mt-3.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] bg-indigo-50 text-indigo-850 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                {book.category}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                                SR# {book.bookId}
                              </span>
                            </div>
                            
                            <h3 
                              onClick={() => setSelectedBook(book)}
                              className="font-extrabold text-[#0f172a] dark:text-slate-100 text-xs sm:text-sm line-clamp-2 hover:text-indigo-650 cursor-pointer transition-colors"
                            >
                               {book.bookName}
                            </h3>
                            <p className="text-[11px] text-slate-500 italic font-medium line-clamp-1">
                              by {book.author}
                            </p>

                            {/* Metadata Details Grid block */}
                            <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-[9.5px] font-mono border border-slate-150 dark:border-slate-800/80 my-2 select-none">
                              <div>
                                <span className="text-slate-400 block text-[7.5px] uppercase font-sans font-bold">Accession No</span>
                                <span className="text-slate-900 dark:text-slate-200 font-black block truncate">{book.accessionNumber || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[7.5px] uppercase font-sans font-bold">Call Number</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-black block truncate">{book.callNumber || book.ddcNumber || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[7.5px] uppercase font-sans font-bold">Book Number</span>
                                <span className="text-slate-900 dark:text-slate-200 font-black block truncate">{book.bookNumber || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[7.5px] uppercase font-sans font-bold">Shelf Location</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-black block truncate">Shelf #{categorySerialsMap.get(book.bookId) || 1}</span>
                              </div>
                            </div>
                            
                            <div className="pt-1 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-red-650'}`}></span>
                              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-350">
                                {isAvailable ? `${t.copiesAvailable} ${book.availableCopies} / ${book.totalCopies}` : t.unavailable}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 mt-2.5">
                            <button
                              onClick={() => setSelectedBook(book)}
                              className="px-2 py-1.5 border border-slate-300 hover:bg-slate-50 dark:border-slate-800 text-[10px] font-bold text-slate-755 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                            >
                              {t.bookDetails}
                            </button>
                            <button
                              onClick={() => handleRequestClick(book)}
                              disabled={!isAvailable}
                              className={`flex-1 px-2 py-1.5 text-[10px] font-black rounded-lg border border-transparent transition-all cursor-pointer text-center ${
                                isAvailable
                                  ? 'bg-[#0f172a] hover:bg-slate-800 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {t.requestBook}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* INFINITE SCROLL CONTROLS */}
                <InfiniteScrollSentinel 
                  onVisible={() => setVisibleBooksCount(prev => prev + 24)}
                  hasMore={paginatedBooks.length < filteredBooks.length}
                />
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
                            {req.status === 'Pending' ? t.pending : req.status === 'Approved' ? t.approved : req.status === 'Cancelled' ? "Cancelled" : t.rejected}
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
      ) : activeSubTab === 'profile' ? (
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
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totReq}</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white block">{studentRequests.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totIssued}</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white block">{studentHistoryOutputFiles.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totReturned}</span>
                  <span className="text-xl font-black text-emerald-600 block">{studentLoansReturnedOnly.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totCurrent}</span>
                  <span className="text-xl font-black text-amber-600 block">{studentLoansIssuedOnly.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">{t.totOverdue}</span>
                  <span className="text-xl font-black text-red-655 block">{studentOverdueLoansList.length}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Feedback & Suggestions Registry Submodule */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs animate-fade-in" id="student-dashboard-feedback-card">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 font-sans">
              <MessageSquare className="w-5.5 h-5.5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm select-none">
                  {currentLang === 'EN' ? "📝 My Feedback, Book Requests & Suggestions" : "📝 मेरी प्रतिक्रिया, पुस्तक अनुरोध और सुझाव"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'EN' 
                    ? "Direct communication channel with school librarian database" 
                    : "पुस्तकालय अध्यक्ष के साथ सीधा संपर्क माध्यम"}
                </p>
              </div>
            </div>

            {myReviewLoading ? (
              <div className="text-center py-6 text-xs text-slate-400 font-mono animate-pulse">
                Syncing with MongoDB Feedback database...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Form column */}
                <div className="md:col-span-7 space-y-3.5">
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                    {feedbackSuccess && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs animate-fade-in font-medium">
                        {feedbackSuccess}
                      </div>
                    )}
                    {feedbackError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-xl text-xs animate-fade-in font-medium">
                        {feedbackError}
                      </div>
                    )}

                    {/* Star Rating Selectors */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block select-none">
                        {currentLang === 'EN' ? "Your Rating (1 to 5 Stars)" : "आपका मूल्यांकन (1 से 5 सितारे)"}
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setFeedbackForm(f => ({ ...f, rating: val }))}
                            className="p-1 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star 
                              className={`w-6 h-6 ${val <= feedbackForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block select-none">
                        {currentLang === 'EN' ? "Category Filter" : "श्रेणी चुनें"}
                      </label>
                      <select
                        value={feedbackForm.type}
                        onChange={(e) => setFeedbackForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2 focus:ring-1 focus:ring-indigo-600 outline-none"
                      >
                        <option value="General">General Suggestion</option>
                        <option value="Book Request">Request New Books</option>
                        <option value="Digital Notes">Digital Syllabus Suggestion</option>
                        <option value="Bug Report">System Bug Report</option>
                        <option value="Complain">Library Complaint</option>
                      </select>
                    </div>

                    {/* Feedback comment description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block select-none">
                        {currentLang === 'EN' ? "Detail Comments" : "विस्तृत टिप्पणी"}
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={feedbackForm.comment}
                        onChange={(e) => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
                        placeholder={
                          currentLang === 'EN'
                            ? "Provide book names you need, describe suggestions, or file bug complaints..."
                            : "कृपया उन पुस्तकों के नाम लिखें जिनकी आपको आवश्यकता है, या पुस्तकालय संबंधी शिकायतें..."
                        }
                        className="w-full text-xs font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2.5 focus:ring-1 focus:ring-indigo-600 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={feedbackSubmitting}
                      className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 animate-pulse" />
                      <span>
                        {feedbackSubmitting 
                          ? (currentLang === 'EN' ? "Saving Suggestion..." : "सुरक्षित किया जा रहा है...") 
                          : myReview 
                            ? (currentLang === 'EN' ? "Update My Verified Feedback" : "मेरी प्रतिक्रिया संशोधित करें") 
                            : (currentLang === 'EN' ? "Submit Suggestion" : "सुझाव दर्ज करें")}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Status/Display Column */}
                <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950/45 p-4 border border-slate-150 dark:border-slate-800/85 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block select-none">
                      {currentLang === 'EN' ? "Active Review Record" : "सक्रिय समीक्षा रिकॉर्ड"}
                    </span>

                    {myReview ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">Rating:</span>
                          <span className="text-xs font-extrabold text-amber-500">★ {myReview.rating} / 5</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">Status:</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            myReview.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            myReview.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            myReview.status === 'Resolved' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {myReview.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">My Comments:</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-100 dark:border-slate-800 leading-relaxed">
                            "{myReview.comment}"
                          </p>
                        </div>

                        {myReview.reply && (
                          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-l-2 border-indigo-550 rounded-r space-y-1">
                            <span className="text-[9.5px] font-black uppercase text-indigo-700 dark:text-indigo-450 block">Librarian Response:</span>
                            <p className="text-xs text-slate-750 dark:text-slate-300 font-extrabold">
                              "{myReview.reply}"
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                        <MessageSquare className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <p className="font-bold leading-normal">
                          {currentLang === 'EN' 
                            ? "No feedback or suggestions submitted yet for your student profile." 
                            : "आपके छात्र प्रोफाइल के लिए अभी तक कोई प्रतिक्रिया दर्ज नहीं की गई है।"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2 font-mono">
                    {currentLang === 'EN' 
                      ? "✍️ You can edit your submitted reviews at any time. Updating will trigger automatic spam filtering classification checks." 
                      : "✍️ आप किसी भी समय सबमिट समीक्षाओं को संपादित कर सकते हैं।"}
                  </div>
                </div>
              </div>
            )}
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
      ) : activeSubTab === 'study-materials' ? (
        /* Study Materials Page/Tab */
        <div className="space-y-4 animate-fade-in" id="student-study-materials-tab">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {currentLang === 'EN' ? "Curated Study Materials & Question Banks" : "पाठ्यक्रम अध्ययन सामग्री और प्रश्न बैंक"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {currentLang === 'EN' 
                    ? `Showing syllabus references allocated specifically for Class ${loggedInStudent.class}` 
                    : `कक्षा ${loggedInStudent.class} के लिए उपलब्ध डिजिटल अध्ययन नोट्स और संसाधन`}
                </p>
              </div>
            </div>

            {studyMaterials && studyMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {studyMaterials.map((mat) => (
                  <div 
                    key={mat.id}
                    className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-205 dark:border-slate-800 hover:border-slate-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-black uppercase">
                          {currentLang === 'EN' ? "Class" : "कक्षा"} {mat.visibleTo}
                        </span>
                        <span className="text-[9px] text-slate-450 font-mono">
                          {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-[#0f172a] dark:text-slate-100 leading-snug">
                        📝 {mat.title}
                      </h4>
                      {mat.description && (
                        <p className="text-[11px] text-slate-505 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {mat.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Expires: {mat.expiryDate}</span>
                      </div>
                      {mat.pdfData && (
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
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-955 font-bold text-[10px] rounded flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-slate-955" />
                          <span>Download PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                <p className="text-xs">
                  {currentLang === 'EN' 
                    ? `No custom syllabus resources uploaded for Class ${loggedInStudent.class} at the moment.` 
                    : `वर्तमान में कक्षा ${loggedInStudent.class} के लिए कोई डिजिटल अध्ययन संसाधन उपलब्ध नहीं हैं।`}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'contact-librarian' ? (
        /* Contact Librarian Tab */
        <div className="space-y-6 animate-fade-in" id="student-contact-librarian-tab">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 font-sans">
              <MessageSquare className="w-5.5 h-5.5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm select-none">
                  💬 {currentLang === 'EN' ? "Contact Librarian" : "पुस्तकालयाध्यक्ष से संपर्क करें"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'EN' 
                    ? "Send direct messages, suggestions, questions, or book recommendations to the school librarian." 
                    : "पुस्तकालयाध्यक्ष को सीधे संदेश, सुझाव, प्रश्न या पुस्तक सिफारिशें भेजें।"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Submission Form */}
              <div className="md:col-span-7 space-y-3.5">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {contactSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs animate-fade-in font-medium">
                      {contactSuccess}
                    </div>
                  )}
                  {contactError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-xl text-xs animate-fade-in font-medium">
                      {contactError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      {currentLang === 'EN' ? "Message Category" : "संदेश श्रेणी"}
                    </label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm(c => ({ ...c, category: e.target.value }))}
                      className="w-full text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="General Question">{currentLang === 'EN' ? "General Question" : "सामान्य प्रश्न"}</option>
                      <option value="Suggestion">{currentLang === 'EN' ? "Suggestion" : "सुझाव"}</option>
                      <option value="Report an Issue">{currentLang === 'EN' ? "Report an Issue" : "समस्या की रिपोर्ट करें"}</option>
                      <option value="Book Recommendation">{currentLang === 'EN' ? "Book Recommendation" : "पुस्तक की सिफारिश"}</option>
                      <option value="Other">{currentLang === 'EN' ? "Other" : "अन्य"}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      {currentLang === 'EN' ? "Your Message" : "आपका संदेश"}
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm(c => ({ ...c, message: e.target.value }))}
                      placeholder={
                        currentLang === 'EN'
                          ? "Write your message or book recommendation here..."
                          : "यहाँ अपना संदेश या पुस्तक की सिफारिश लिखें..."
                      }
                      className="w-full text-xs font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-600 outline-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {contactSubmitting 
                        ? (currentLang === 'EN' ? "Sending message..." : "संदेश भेजा जा रहा है...") 
                        : (currentLang === 'EN' ? "Send Message to Librarian" : "पुस्तकालयाध्यक्ष को संदेश भेजें")}
                    </span>
                  </button>
                </form>
              </div>

              {/* Sent Messages History */}
              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950/45 p-4 border border-slate-150 dark:border-slate-800/85 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    {currentLang === 'EN' ? "My Sent Messages" : "मेरे भेजे गए संदेश"}
                  </span>

                  {contactMessagesLoading ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-mono animate-pulse">
                      Loading messages...
                    </div>
                  ) : contactMessages.length > 0 ? (
                    <div className="space-y-3">
                      {contactMessages.map((msg) => (
                        <div key={msg.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] bg-slate-100 text-slate-705 px-2 py-0.5 rounded font-bold font-mono">
                              {msg.category}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              msg.status === 'Read' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                            }`}>
                              {msg.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                            "{msg.message}"
                          </p>
                          <span className="text-[8.5px] font-mono text-slate-400 block">
                            Sent: {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-bold leading-normal">
                        {currentLang === 'EN' 
                          ? "No messages sent yet." 
                          : "अभी तक कोई संदेश नहीं भेजा गया है।"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2 font-mono">
                  {currentLang === 'EN' 
                    ? "✉️ Messages are checked daily by the library administration staff." 
                    : "✉️ संदेशों की जांच रोजाना पुस्तकालय प्रशासन कर्मचारियों द्वारा की जाती है।"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

                <div className="grid grid-cols-2 gap-3.5 text-[11px] border-t border-slate-150 pt-3">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Category</span>
                    <span className="font-bold text-[#0f172a] dark:text-indigo-400 block mt-0.5">{selectedBook.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Availability State</span>
                    <span className={`font-extrabold block mt-0.5 ${selectedBook.availableCopies > 0 ? 'text-emerald-700 font-bold' : 'text-red-655'}`}>
                      {selectedBook.availableCopies > 0 ? `${t.available} (${selectedBook.availableCopies} of ${selectedBook.totalCopies} Copies)` : t.unavailable}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Accession Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{selectedBook.accessionNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Call / Book Number</span>
                    <span className="font-bold text-indigo-650 dark:text-indigo-400 block mt-0.5">{selectedBook.callNumber || selectedBook.ddcNumber || "N/A"} / {selectedBook.bookNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Publisher</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5 truncate">{selectedBook.publisher || "Ramdiri Library Publications"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8.5px] tracking-wide font-mono">Shelf Location</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">Shelf #{categorySerialsMap.get(selectedBook.bookId) || 1}</span>
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
                  className="w-full text-xs font-bold text-slate-900 dark:text-white p-3 bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-800 focus:border-[#0f172a] dark:focus:border-indigo-500 rounded-lg outline-none min-h-[90px] h-[90px] resize-none"
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
                disabled={isSubmittingRequest}
                className={`px-4 py-2 text-white font-black text-xs rounded-lg transition-all flex items-center gap-2 ${
                  isSubmittingRequest
                    ? 'bg-slate-500 cursor-not-allowed opacity-75'
                    : 'bg-[#0f172a] hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {isSubmittingRequest && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {isSubmittingRequest
                    ? (currentLang === 'EN' ? "Submitting..." : "सबमिट हो रहा है...")
                    : (currentLang === 'EN' ? "Submit Borrow Request" : "अनुरोध सबमिट करें")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
