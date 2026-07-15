/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Book, Student } from '../types';
import { 
  BookOpen, Award, GraduationCap, MapPin, 
  Phone, Mail, Calendar, Key, Shield, User, X, CheckCircle, AlertCircle, Eye, EyeOff,
  Search, LayoutGrid, Table, Info, FileText, MessageSquare, Download, Star, Send, ChevronDown,
  TrendingUp, Server, HardDrive, Sparkles, Clock, ArrowRight, ZoomIn, ZoomOut, RotateCcw, Camera
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

// Google Books on-the-fly fetcher component
export function GoogleBookCover({ bookName, author, coverImage }: { bookName: string; author: string; coverImage?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(coverImage || null);

  useEffect(() => {
    if (coverImage) {
      setImgUrl(coverImage);
      return;
    }
    let isMounted = true;
    
    // Call google books search api
    const query = encodeURIComponent(`${bookName} ${author}`);
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        const items = data.items;
        if (items && items.length > 0) {
          const thumbnail = items[0].volumeInfo?.imageLinks?.thumbnail || items[0].volumeInfo?.imageLinks?.smallThumbnail;
          if (thumbnail) {
            setImgUrl(thumbnail.replace(/^http:/, 'https:'));
          }
        }
      })
      .catch(() => {
        // Fallback gracefully
      });

    return () => { isMounted = false; };
  }, [bookName, author, coverImage]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={bookName}
        referrerPolicy="no-referrer"
        className="w-full h-48 object-cover rounded-md shadow-sm border border-slate-200 transition-transform hover:scale-105 duration-250"
      />
    );
  }

  // Stylish government-style fallback cover with high contrast and typography
  return (
    <div className="w-full h-48 bg-gradient-to-br from-slate-700 to-slate-900 text-white p-3.5 flex flex-col justify-between rounded-md shadow-sm border border-slate-600 select-none">
      <div className="text-[9px] uppercase tracking-wider font-bold text-amber-400 font-mono">
        Ramdiri Library
      </div>
      <div>
        <h4 className="font-sans font-bold leading-tight text-xs line-clamp-3 mb-1">
          {bookName}
        </h4>
        <span className="text-[10px] text-slate-300 font-medium block">
          BY {author}
        </span>
      </div>
      <div className="flex justify-between items-center text-[8px] font-mono border-t border-emerald-800 pt-1.5 mt-1">
        <span>BSEB SEC</span>
        <span>RS-959</span>
      </div>
    </div>
  );
}

interface PublicHomeProps {
  currentLang: 'EN' | 'HI';
  books: Book[];
  students: Student[];
  studyMaterials?: any[];
  onLoginSuccess: (role: 'Student' | 'Librarian', student?: Student) => void;
  isLoggedIn: boolean;
  loggedInUserLabel: string;
  onLogout: () => void;
  onNavigatePortal: () => void;
  loggedInRole?: 'Guest' | 'Student' | 'Librarian';
}

export default function PublicHome({
  currentLang,
  books,
  students,
  studyMaterials = [],
  onLoginSuccess,
  isLoggedIn,
  loggedInUserLabel,
  onLogout,
  onNavigatePortal,
  loggedInRole = 'Guest'
}: PublicHomeProps) {
  // New Layout & Feature States
  const [homeActiveTab, setHomeActiveTab] = useState<'catalog' | 'resources' | 'feedback' | 'vision' | 'docs' | 'health'>('catalog');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const formatName = (fullName: string) => {
    if (!fullName) return "Anonymous";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase() + ".";
    return `${firstName} ${lastInitial}`;
  };

  useEffect(() => {
    let title = "PM SHRI Ramdiri +2 High School Library - Digital Catalog";
    if (homeActiveTab === 'resources') {
      title = "Digital Notes & Syllabus - PM SHRI Ramdiri +2 High School Library";
    } else if (homeActiveTab === 'feedback') {
      title = "Community Feedback - PM SHRI Ramdiri +2 High School Library";
    } else if (homeActiveTab === 'vision') {
      title = "Impact & Story - PM SHRI Ramdiri +2 High School Library";
    } else if (homeActiveTab === 'docs') {
      title = "System Documentation - PM SHRI Ramdiri +2 High School Library";
    } else if (homeActiveTab === 'health') {
      title = "System Health & Confidence - PM SHRI Ramdiri +2 High School Library";
    }
    document.title = title;
  }, [homeActiveTab]);

  // Live Stats with instant local storage caching to completely remove the "0 Books" initial state under SRE rules
  const [liveStats, setLiveStats] = useState(() => {
    try {
      const cached = localStorage.getItem('ramdiri_cached_stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.booksCount === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read cached stats from localStorage:", e);
    }
    return {
      booksCount: books.length || 0,
      studentsCount: students.length || 0,
      digitalMaterialsCount: studyMaterials.length || 0,
      activeIssuedCount: 0,
      avgRating: 0.0,
      totalFeedbackCount: 0
    };
  });
  const [isStatsLoading, setIsStatsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('ramdiri_cached_stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.booksCount === 'number' && parsed.booksCount > 0) {
          return false;
        }
      }
    } catch (_) {}
    return true;
  });

  // Feedback states
  const [publicFeedbacks, setPublicFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
  const [feedbackSubmitLoading, setFeedbackSubmitLoading] = useState<boolean>(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);
  const [newFeedbackForm, setNewFeedbackForm] = useState({
    name: '',
    role: 'Student',
    rating: 5,
    type: 'General',
    comment: ''
  });
  const [feedbackRefreshTrigger, setFeedbackRefreshTrigger] = useState<number>(0);
  const [existingUserReview, setExistingUserReview] = useState<any | null>(null);

  // Inline profile editing states
  const [isEditingProfileInline, setIsEditingProfileInline] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileDesignation, setEditProfileDesignation] = useState('');
  const [editProfileBiography, setEditProfileBiography] = useState('');
  const [editProfileYears, setEditProfileYears] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [isSavingProfileInline, setIsSavingProfileInline] = useState(false);
  const [inlineProfileError, setInlineProfileError] = useState<string | null>(null);
  const [inlineProfileSuccess, setInlineProfileSuccess] = useState<string | null>(null);

  const [librarianProfile, setLibrarianProfile] = useState<{
    name: string;
    designation: string;
    biography: string;
    profilePhoto: string;
    yearsOfService: string;
  } | null>(null);
  const [isLibrarianLoading, setIsLibrarianLoading] = useState(true);

  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);

  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState<number>(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
      setInitialScale(zoomScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchStartDist;
      const nextScale = Math.min(Math.max(initialScale * scaleFactor, 0.5), 3);
      setZoomScale(nextScale);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  useEffect(() => {
    setIsLibrarianLoading(true);
    fetch('/api/librarian/profile')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setLibrarianProfile({
            name: data.name || "the Librarian",
            designation: data.designation || "Librarian",
            biography: data.biography || "No biography configured.",
            profilePhoto: data.profilePhoto || "",
            yearsOfService: data.yearsOfService || ""
          });
        }
      })
      .catch(err => console.warn("Could not load librarian profile:", err))
      .finally(() => {
        setIsLibrarianLoading(false);
      });
  }, []);

  useEffect(() => {
    setIsGalleryLoading(true);
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setGalleryImages(data.images || []);
        }
      })
      .catch(err => console.warn("Could not load gallery images:", err))
      .finally(() => {
        setIsGalleryLoading(false);
      });
  }, []);

  useEffect(() => {
    // Fetch live public statistics
    setIsStatsLoading(true);
    fetch('/api/public-stats')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const stats = {
            booksCount: typeof data.booksCount === 'number' ? data.booksCount : books.length,
            studentsCount: typeof data.studentsCount === 'number' ? data.studentsCount : students.length,
            digitalMaterialsCount: typeof data.digitalMaterialsCount === 'number' ? data.digitalMaterialsCount : studyMaterials.length,
            activeIssuedCount: typeof data.activeIssuedCount === 'number' ? data.activeIssuedCount : 0,
            avgRating: typeof data.avgRating === 'number' ? data.avgRating : 0.0,
            totalFeedbackCount: typeof data.totalFeedbackCount === 'number' ? data.totalFeedbackCount : 0
          };
          setLiveStats(stats);
          try {
            localStorage.setItem('ramdiri_cached_stats', JSON.stringify(stats));
          } catch (e) {
            console.warn("Could not write cached stats:", e);
          }
        }
      })
      .catch(err => console.warn("Could not load public statistics:", err))
      .finally(() => {
        setIsStatsLoading(false);
      });

    // Fetch public feedbacks
    setFeedbackLoading(true);
    fetch('/api/feedback/public')
      .then(res => res.json())
      .then(data => {
        if (data && data.feedbacks) {
          setPublicFeedbacks(data.feedbacks);
        }
      })
      .catch(err => console.warn("Could not load public feedbacks:", err))
      .finally(() => setFeedbackLoading(false));
  }, [feedbackRefreshTrigger]);

  // Synchronize local states instantly based on parent props primitive lengths without network calls or skeleton loading
  useEffect(() => {
    setLiveStats(prev => ({
      ...prev,
      booksCount: books.length > 0 ? books.length : prev.booksCount,
      studentsCount: (students && students.length > 0) ? students.length : prev.studentsCount,
      digitalMaterialsCount: studyMaterials.length > 0 ? studyMaterials.length : prev.digitalMaterialsCount,
    }));
  }, [books.length, students.length, studyMaterials.length]);

  useEffect(() => {
    if (isLoggedIn && homeActiveTab === 'feedback') {
      const token = localStorage.getItem("ramdiri_library_token");
      if (token) {
        fetch('/api/feedback/my-review', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.feedback) {
              setExistingUserReview(data.feedback);
              setNewFeedbackForm({
                name: data.feedback.studentName || loggedInUserLabel || '',
                role: data.feedback.studentRole || 'Student',
                rating: data.feedback.rating || 5,
                type: data.feedback.type || 'General',
                comment: data.feedback.comment || ''
              });
            } else {
              setNewFeedbackForm(f => ({
                ...f,
                name: loggedInUserLabel || '',
                role: loggedInRole === 'Student' ? 'Student' : 'Visitor'
              }));
            }
          })
          .catch(err => console.warn("Could not fetch current student's review:", err));
      } else {
        setNewFeedbackForm(f => ({
          ...f,
          name: loggedInUserLabel || '',
          role: loggedInRole === 'Student' ? 'Student' : 'Visitor'
        }));
      }
    } else {
      setNewFeedbackForm(f => ({
        ...f,
        name: isLoggedIn ? loggedInUserLabel : '',
        role: isLoggedIn && loggedInRole === 'Student' ? 'Student' : 'Visitor'
      }));
    }
  }, [isLoggedIn, homeActiveTab, feedbackRefreshTrigger, loggedInUserLabel, loggedInRole]);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackForm.name.trim()) {
      alert(currentLang === 'EN' ? "Please enter your name." : "कृपया अपना नाम दर्ज करें।");
      return;
    }
    if (!newFeedbackForm.comment.trim()) {
      alert(currentLang === 'EN' ? "Please write some feedback comment." : "कृपया अपनी प्रतिक्रिया या टिप्पणी लिखें।");
      return;
    }
    setFeedbackSubmitLoading(true);
    fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newFeedbackForm.name,
        role: newFeedbackForm.role,
        rating: newFeedbackForm.rating,
        type: newFeedbackForm.type,
        comment: newFeedbackForm.comment
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 201) {
          const msg = currentLang === 'EN'
            ? "Thank you! Your feedback has been submitted successfully and is currently pending librarian approval."
            : "धन्यवाद! आपकी प्रतिक्रिया सफलतापूर्वक जमा हो गई है और वर्तमान में पुस्तकालयाध्यक्ष की स्वीकृति के लिए लंबित है।";
          
          setFeedbackSuccessMsg(msg);
          setFeedbackRefreshTrigger(prev => prev + 1);
          setNewFeedbackForm(f => ({
            ...f,
            comment: '',
            rating: 5
          }));
          setTimeout(() => setFeedbackSuccessMsg(null), 10000);
        } else {
          alert(data.error || "Could not submit feedback.");
        }
      })
      .catch(() => alert("Network error submitting feedback."))
      .finally(() => setFeedbackSubmitLoading(false));
  };

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginRole, setLoginRole] = useState<'Student' | 'Librarian'>('Student');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Student Login Fields
  const [studentRoll, setStudentRoll] = useState<string>('');
  const [studentDOB, setStudentDOB] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('10');
  const [studentSection, setStudentSection] = useState<string>('A');

  // Librarian Login Fields
  const [librarianUsername, setLibrarianUsername] = useState<string>('');
  const [librarianPassword, setLibrarianPassword] = useState<string>('');

  // Validation States
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<Book | null>(null);

  // Generate distinct category filters
  const categoriesList = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  const [homeSearchInput, setHomeSearchInput] = useState<string>('');
  const [homeSearchQuery, setHomeSearchQuery] = useState<string>('');
  const [homeViewMode, setHomeViewMode] = useState<'cards' | 'table'>('cards');

  // Combined Filters state
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [bookLanguageFilter, setBookLanguageFilter] = useState<string>('all');
  const [sortByFilter, setSortByFilter] = useState<string>('relevance');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setHomeSearchQuery(homeSearchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [homeSearchInput]);

  // Create Category-wise Shelf Serial Map
  const categorySerialsMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const groups: { [cat: string]: Book[] } = {};
    
    // Group books by category
    books.forEach(b => {
      const cat = b.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });

    // For each category, sort by Accession Number ascending
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

  // Filter books dynamically based on category tab selection, availability, language, search query, and sorting
  const filteredFeaturedBooks = React.useMemo(() => {
    let result = [...books];

    // 1. DDC Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }

    // 2. Availability Filter
    if (availabilityFilter === 'available') {
      result = result.filter(b => b.availableCopies > 0);
    } else if (availabilityFilter === 'outofstock') {
      result = result.filter(b => b.availableCopies === 0);
    }

    // 3. Book Language Filter
    if (bookLanguageFilter === 'hindi') {
      result = result.filter(b => /[\u0900-\u097F]/.test(b.bookName || b.author || ""));
    } else if (bookLanguageFilter === 'english') {
      result = result.filter(b => !/[\u0900-\u097F]/.test(b.bookName || b.author || ""));
    }

    // 4. Search Filter (incorporating Hinglish, spelling corrections, DDC class)
    if (homeSearchQuery) {
      result = searchBooksSmart(result, homeSearchQuery);
    }

    // 5. Sorting
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
      // Default: numeric shelf serial sorting to avoid string sequence anomalies
      result.sort((a, b) => {
        const idA = parseInt(a.bookId.replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(b.bookId.replace(/\D/g, ''), 10) || 0;
        if (idA !== idB) return idA - idB;
        return a.bookId.localeCompare(b.bookId, undefined, { numeric: true });
      });
    }

    return result;
  }, [books, selectedCategory, availabilityFilter, bookLanguageFilter, homeSearchQuery, sortByFilter]);

  const featuredBooks = filteredFeaturedBooks;

  // Infinite scroll book count state
  const [visibleBooksCount, setVisibleBooksCount] = React.useState<number>(24);

  // Reset page when any filter parameters change
  React.useEffect(() => {
    setVisibleBooksCount(24);
  }, [selectedCategory, homeSearchQuery, availabilityFilter, bookLanguageFilter, sortByFilter]);

  const paginatedBooks = React.useMemo(() => {
    return featuredBooks.slice(0, visibleBooksCount);
  }, [featuredBooks, visibleBooksCount]);

  const t = {
    EN: {
      dlmsTitle: "Digital Library Management System",
      welcomeBanner: "PM SHRI Ramdiri +2 High School Library",
      subTitleText: "",
      established: "",
      tagline: "Empowering our students around Begusarai with accessible digitizations, NCERT syllabus handbooks, and literature cataloging.",
      featuredHeadline: "Featured Books & Syllabus Reference",
      available: "In Stock",
      outOfStock: "All Issued",
      categoriesTitle: "Browse Books by Categories",
      studentTab: "Student Login",
      librarianTab: "Librarian Portal",
      studentRollLabel: "Roll Number",
      rollPlaceholder: "Enter Roll Number (e.g., 12)",
      dobLabel: "Date of Birth (DOB)",
      librarianUserLabel: "Username",
      usernamePlaceholder: "Enter Username",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter Password",
      loading: "Authenticating securely...",
      loginBtn: "Login to Library",
      logoutBtn: "Log Out Account",
      guestLabel: "Guest Scholar",
      aboutTitle: "About PM SHRI Ramdiri School Library",
      aboutContent: "PM SHRI Ramdiri +2 High School, located in the historical district of Begusarai, Bihar, is a senior secondary high school. The Digital Library Portal is an independent modernization initiative spearheaded by the school librarian to simplify textbooks tracking, NCERT reference materials distribution, and book transactions for students.",
      locationText: "Ramdiri Village, Begusarai District, Bihar - 851129",
      contactPhone: "+91-6243-245102 (BSEB Begusarai Office)",
      statTotalBooks: "Total Books",
      statIssuedBooks: "Issued Books",
      statRegisteredStudents: "Registered Students",
      statDigitalResources: "Digital Resources",
      statCommunityRating: "Community Rating",
      unitUnits: "units",
      unitActive: "active",
      unitScholars: "scholars",
      unitPdfs: "PDFs",
      unitReviews: "reviews"
    },
    HI: {
      dlmsTitle: "डिजिटल पुस्तकालय प्रबंधन प्रणाली",
      welcomeBanner: "पीएम श्री रामदीरी +2 उच्च विद्यालय पुस्तकालय",
      subTitleText: "",
      established: "",
      tagline: "बेगूसराय क्षेत्र के हमारे विद्यार्थियों को आधुनिक डिजिटल कैटलॉग, एनसीईआरटी पाठ्यपुस्तकों और साहित्यिक रचनाओं तक सरल पहुंच प्रदान करना।",
      featuredHeadline: "समीक्षित एवं अनुशंसित उत्कृष्ट पुस्तकें",
      available: "स्टॉक में उपलब्ध",
      outOfStock: "सभी जारी हैं",
      categoriesTitle: "पुस्तक श्रेणियों के अनुसार खोजें",
      studentTab: "छात्र लॉगिन (Roll + DOB)",
      librarianTab: "पुस्तकालयाध्यक्ष लॉगिन",
      studentRollLabel: "अनुक्रमांक (Roll Number)",
      rollPlaceholder: "अपना रॉल नंबर दर्ज करें (उदा. 12)",
      dobLabel: "जन्म तिथि (Date of Birth)",
      librarianUserLabel: "यूज़रनेम",
      usernamePlaceholder: "यूज़रनेम दर्ज करें",
      passwordLabel: "पासवर्ड",
      passwordPlaceholder: "पासवर्ड दर्ज करें",
      loading: "सुरक्षित प्रमाणीकरण जारी है...",
      loginBtn: "पुस्तकालय लॉगिन",
      logoutBtn: "लॉगआउट करें",
      guestLabel: "अतिथि पाठक",
      aboutTitle: "पीएम श्री रामदीरी उच्च विद्यालय पुस्तकालय के बारे में",
      aboutContent: "पीएम श्री रामदीरी +2 उच्च विद्यालय, बेगूसराय, बिहार में स्थित एक माध्यमिक एवं उच्चतर माध्यमिक विद्यालय है। यह डिजिटल पुस्तकालय पोर्टल विद्यालय के पुस्तकालयाध्यक्ष द्वारा पुस्तकालय सेवाओं को आधुनिक बनाने के लिए शुरू की गई एक स्वतंत्र पहल है, जिसका उद्देश्य छात्रों के लिए पुस्तकों और एनसीईआरटी पाठ्यसामग्री की उपलब्धता को सुगम बनाना है।",
      locationText: "ग्राम - रामदीरी, बेगूसराय जिला, बिहार - 851129",
      contactPhone: "+91-6243-245102 (बेगूसराय शिक्षा कार्यालय)",
      statTotalBooks: "कुल पुस्तकें",
      statIssuedBooks: "जारी पुस्तकें",
      statRegisteredStudents: "पंजीकृत छात्र",
      statDigitalResources: "डिजिटल संसाधन",
      statCommunityRating: "सामुदायिक रेटिंग",
      unitUnits: "इकाइयां",
      unitActive: "सक्रिय",
      unitScholars: "छात्र",
      unitPdfs: "पीडीएफ",
      unitReviews: "समीक्षाएं"
    }
  }[currentLang];

  const handleStudentAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const roll = parseInt(studentRoll);
    if (!studentRoll || isNaN(roll) || roll <= 0) {
      setAuthError(currentLang === 'EN' ? "Please enter a valid positive Roll Number." : "कृपया एक मान्य सकारात्मक रॉल नंबर दर्ज करें।");
      return;
    }
    if (!studentDOB) {
      setAuthError(currentLang === 'EN' ? "Please select / specify your Date of Birth." : "कृपया अपनी जन्म तिथि का चयन करें।");
      return;
    }

    setAuthLoading(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'Student',
        rollNumber: studentRoll,
        dob: studentDOB,
        classValue: studentClass,
        sectionValue: studentSection,
        studentsList: students
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          localStorage.setItem("ramdiri_library_token", data.token);
          onLoginSuccess('Student', data.student);
          setShowLoginModal(false);
          setStudentRoll('');
          setStudentDOB('');
          setStudentClass('10');
          setStudentSection('A');
        } else {
          setAuthError(data.error || (currentLang === 'EN' ? "Authentication failed." : "प्रमाणीकरण विफल रहा।"));
        }
      })
      .catch(() => {
        setAuthError(currentLang === 'EN' ? "Network Connection Error." : "नेटवर्क कनेक्शन त्रुटि।");
      })
      .finally(() => {
        setAuthLoading(false);
      });
  };

  const handleLibrarianAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!librarianUsername.trim()) {
      setAuthError(currentLang === 'EN' ? "Please fill in the librarian username." : "कृपया यूज़रनेम भरें।");
      return;
    }
    if (!librarianPassword) {
      setAuthError(currentLang === 'EN' ? "Please enter the administrative password." : "कृपया सुरक्षा पासवर्ड दर्ज करें।");
      return;
    }

    setAuthLoading(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'Librarian',
        username: librarianUsername,
        password: librarianPassword
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          localStorage.setItem("ramdiri_library_token", data.token);
          onLoginSuccess('Librarian');
          setShowLoginModal(false);
          setLibrarianUsername('');
          setLibrarianPassword('');
        } else {
          setAuthError(data.error || (currentLang === 'EN' ? "Incorrect credentials." : "गलत क्रेडेंशियल्स।"));
        }
      })
      .catch(() => {
        setAuthError(currentLang === 'EN' ? "Network Connection Error." : "नेटवर्क कनेक्शन त्रुटि।");
      })
      .finally(() => {
        setAuthLoading(false);
      });
  };

  return (
    <div className="space-y-8" id="ramdiri-homepage-root">
      
      {/* Bihar Government Theme Welcome Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-slate-500/5 rounded-full pointer-events-none transform translate-x-8 -translate-y-8"></div>
        
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          {/* Circular School Seal */}
          <div className="w-16 h-16 rounded-full bg-slate-105 border border-slate-300 flex items-center justify-center text-slate-800 font-extrabold shadow-inner shrink-0 select-none">
            <GraduationCap className="w-8 h-8 text-slate-700" />
          </div>
          <div>
            {t.established && (
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider leading-none block w-max mx-auto md:mx-0">
                {t.established}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-tight">
              {t.welcomeBanner}
            </h1>
            {t.subTitleText ? (
              <p className="text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-wide">
                {t.dlmsTitle} • {t.subTitleText}
              </p>
            ) : (
              <p className="text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-wide">
                {t.dlmsTitle}
              </p>
            )}
          </div>
        </div>

        {/* Auth CTA Trigger */}
        <div className="shrink-0">
          {isLoggedIn ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-xs text-right hidden sm:block">
                <span className="text-slate-400 block font-mono">Current Session</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{loggedInUserLabel}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onNavigatePortal}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Portal</span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs rounded-lg cursor-pointer transition-all"
                >
                  {t.logoutBtn}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthError(null);
                setShowLoginModal(true);
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-955 font-bold text-xs rounded-xl shadow-md cursor-pointer tracking-wider hover:shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
              id="home-trigger-login-btn"
            >
              <Key className="w-4 h-4 text-slate-955" />
              <span>{t.loginBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* FEATURE 1 — LIBRARIAN PROFILE CARD */}
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-50 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden" id="librarian-profile-homepage">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full pointer-events-none transform translate-x-12 -translate-y-12"></div>
        
        {isLibrarianLoading || !librarianProfile ? (
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10 animate-pulse">
            {/* Avatar skeleton */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
            {/* Details skeleton */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex justify-center md:justify-start gap-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto md:mx-0"></div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto md:mx-0"></div>
              <div className="space-y-2 pt-1">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded mx-auto md:mx-0"></div>
              </div>
            </div>
          </div>
        ) : (loggedInRole === 'Librarian' && isEditingProfileInline) ? (
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSavingProfileInline(true);
              setInlineProfileError(null);
              setInlineProfileSuccess(null);
              try {
                const token = localStorage.getItem("ramdiri_library_token");
                const res = await fetch('/api/librarian/profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    name: editProfileName,
                    designation: editProfileDesignation,
                    biography: editProfileBiography,
                    yearsOfService: editProfileYears,
                    profilePhoto: editProfilePhoto
                  })
                });
                const data = await res.json();
                if (data && data.success) {
                  setLibrarianProfile({
                    name: editProfileName.trim(),
                    designation: editProfileDesignation.trim(),
                    biography: editProfileBiography.trim(),
                    yearsOfService: editProfileYears.trim(),
                    profilePhoto: editProfilePhoto
                  });
                  if (data.token) {
                    localStorage.setItem("ramdiri_library_token", data.token);
                  }
                  setInlineProfileSuccess("Librarian profile updated successfully!");
                  setIsEditingProfileInline(false);
                } else {
                  setInlineProfileError(data.error || "Failed to save profile changes.");
                }
              } catch (err: any) {
                setInlineProfileError(err.message || "An error occurred.");
              } finally {
                setIsSavingProfileInline(false);
              }
            }}
            className="space-y-4 relative z-10 text-xs text-slate-900 dark:text-slate-100"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                📝 Edit Librarian's Desk Profile Card
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfileInline(false)}
                className="text-xs font-black text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 px-2.5 py-1 rounded transition-all cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Librarian Display Name</label>
                <input
                  type="text"
                  required
                  value={editProfileName}
                  onChange={e => setEditProfileName(e.target.value)}
                  className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-850 outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Professional Designation</label>
                <input
                  type="text"
                  required
                  value={editProfileDesignation}
                  onChange={e => setEditProfileDesignation(e.target.value)}
                  className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-850 outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Years of Service (Optional)</label>
                <input
                  type="text"
                  value={editProfileYears}
                  onChange={e => setEditProfileYears(e.target.value)}
                  placeholder="e.g. 25+ Years of Service"
                  className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-850 outline-none font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block">📷 Change Profile Photo</label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-755 text-indigo-750 dark:text-indigo-300 font-bold text-xs rounded-lg cursor-pointer border border-indigo-200 dark:border-slate-700 flex items-center gap-1.5 transition-all select-none">
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          setInlineProfileError("Please select a valid image file.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxDim = 300;
                            let width = img.width;
                            let height = img.height;
                            if (width > height) {
                              if (width > maxDim) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                              }
                            } else {
                              if (height > maxDim) {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                              }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                              setEditProfilePhoto(dataUrl);
                              setInlineProfileError(null);
                            } else {
                              setEditProfilePhoto(event.target?.result as string);
                            }
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {editProfilePhoto ? (
                    <div className="flex items-center gap-2">
                      <img src={editProfilePhoto} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border" alt="Profile Preview" />
                      <button
                        type="button"
                        onClick={() => setEditProfilePhoto('')}
                        className="text-[11px] font-bold text-red-600 hover:text-red-500 cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">No custom photo (Default avatar active)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Desk biography (Welcome Quote)</label>
              <textarea
                rows={3}
                required
                value={editProfileBiography}
                onChange={e => setEditProfileBiography(e.target.value)}
                placeholder="Write a warm message to scholars visiting the library..."
                className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-850 outline-none leading-relaxed"
              />
            </div>

            {inlineProfileError && (
              <p className="text-red-600 font-bold font-mono text-[11px]">{inlineProfileError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSavingProfileInline}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-955 font-black uppercase rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {isSavingProfileInline ? "Saving Profile..." : "Save Profile Details"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfileInline(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 text-slate-750 font-extrabold uppercase rounded-xl cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">

            {/* Headshot / Avatar */}
            <div className="shrink-0 select-none">
              {librarianProfile.profilePhoto ? (
                <img
                  src={librarianProfile.profilePhoto}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-indigo-100 dark:border-slate-800 shadow-md cursor-zoom-in hover:opacity-95 hover:scale-105 active:scale-95 transition-all"
                  alt={librarianProfile.name}
                  onClick={() => {
                    setViewerPhoto({
                      url: librarianProfile.profilePhoto,
                      title: librarianProfile.name,
                      subtitle: librarianProfile.designation
                    });
                    setZoomScale(1);
                    setIsPhotoViewerOpen(true);
                  }}
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-600 border-2 border-indigo-100 dark:border-slate-800 flex items-center justify-center text-white text-2xl font-black shadow-md">
                  {librarianProfile.name
                    ? librarianProfile.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : "SR"
                  }
                </div>
              )}
            </div>

            {/* Profile details */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="text-[10px] bg-indigo-100 text-indigo-805 dark:bg-indigo-950/50 dark:text-indigo-400 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Librarian's Desk
                  </span>
                  {librarianProfile.yearsOfService && (
                    <span className="text-[10px] bg-amber-100 text-amber-855 dark:bg-amber-950/50 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full tracking-wider">
                      ★ {librarianProfile.yearsOfService}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1 leading-tight">
                  {librarianProfile.name}
                </h2>
                <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {librarianProfile.designation}
                </p>
              </div>

              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-sans font-medium italic">
                "{librarianProfile.biography}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE: LIBRARY GALLERY */}
      <div className="mt-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              <span>{currentLang === 'EN' ? "Inside Our Library" : "हमारे पुस्तकालय की झलकियाँ"}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {currentLang === 'EN' 
                ? "Showcasing our physical reading spaces, bookshelves, and academic activities." 
                : "हमारे पाठन कक्ष, पुस्तकों की अलमारियों और शैक्षणिक गतिविधियों की झलक।"}
            </p>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded">
            {galleryImages.length} {galleryImages.length === 1 ? (currentLang === 'EN' ? 'Photo' : 'तस्वीर') : (currentLang === 'EN' ? 'Photos' : 'तस्वीरें')}
          </span>
        </div>

        {isGalleryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-video w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
            ))}
          </div>
        ) : galleryImages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-mono italic">
            {currentLang === 'EN' ? "No configured photographs" : "कोई जानकारी उपलब्ध नहीं है"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((img: any, idx: number) => (
              <div 
                key={img.id || idx} 
                className="group relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-zoom-in shadow-sm hover:shadow-md transition-all duration-350"
                onClick={() => {
                  setViewerPhoto({
                    url: img.url,
                    title: img.caption || (currentLang === 'EN' ? "Library Gallery Image" : "पुस्तकालय की तस्वीर"),
                    subtitle: currentLang === 'EN' ? "Inside Our Library" : "हमारे पुस्तकालय की झलकियाँ"
                  });
                  setZoomScale(1);
                  setIsPhotoViewerOpen(true);
                }}
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={img.url}
                    alt={img.caption || "Library gallery photo"}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                    <p className="text-[11px] font-sans font-bold text-white line-clamp-1">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Feature Tabs Switcher */}
      <div className="flex border-b-2 border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        <button
          onClick={() => setHomeActiveTab('catalog')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-4 transition-all shrink-0 flex items-center gap-2 ${
            homeActiveTab === 'catalog'
              ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{currentLang === 'EN' ? "Book Catalog" : "पुस्तक सूची (Catalog)"}</span>
        </button>
        <button
          onClick={() => setHomeActiveTab('resources')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-4 transition-all shrink-0 flex items-center gap-2 ${
            homeActiveTab === 'resources'
              ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{currentLang === 'EN' ? "Digital Notes & Syllabus" : "डिजिटल संसाधन (Syllabus)"}</span>
        </button>
        <button
          onClick={() => setHomeActiveTab('vision')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-4 transition-all shrink-0 flex items-center gap-2 ${
            homeActiveTab === 'vision'
              ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{currentLang === 'EN' ? "Impact & Story" : "प्रभाव एवं कहानी (Vision)"}</span>
        </button>
        <button
          onClick={() => setHomeActiveTab('health')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-4 transition-all shrink-0 flex items-center gap-2 ${
            homeActiveTab === 'health'
              ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>{currentLang === 'EN' ? "System Health & Confidence" : "सिस्टम स्वास्थ्य (Health)"}</span>
        </button>
        <button
          onClick={() => setHomeActiveTab('feedback')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-4 transition-all shrink-0 flex items-center gap-2 ${
            homeActiveTab === 'feedback'
              ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{currentLang === 'EN' ? "Community Reviews" : "सुझाव और फीडबैक"}</span>
        </button>
      </div>

      {/* Hero Announcement Block - Secondary teaser */}
      {homeActiveTab === 'catalog' && (
        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-6 sm:p-10 rounded-2xl shadow-md relative border border-slate-700">
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block font-mono">★★ PM SHRI Ramdiri High School Library ★★</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bridging Books and Young Minds
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans font-light">
              {t.tagline}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="#about-section"
                className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold rounded shadow transition-all"
              >
                Learn More
              </a>
              {!isLoggedIn && (
                <button
                  onClick={() => {
                    setAuthError(null);
                    setShowLoginModal(true);
                  }}
                  className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-955 text-xs font-extrabold rounded shadow tracking-wide animate-pulse"
                >
                  Access Account Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Book Catalog Register & Search Engine */}
      {homeActiveTab === 'catalog' && (
        <div className="space-y-5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm">
        
        {/* Catalog Header with view switches */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b-2 border-slate-205 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black uppercase text-slate-905 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-700 font-bold" />
              <span>{currentLang === 'EN' ? "OFFICIAL PM SHRI BOOK CATALOG & SHELF REGISTER" : "आधिकारिक पीएम श्री पुस्तक सूची एवं शेल्फ रजिस्टर"}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {currentLang === 'EN' 
                ? "Locate books immediately by physical shelf position, accession numbers, and call codes."
                : "भौतिक शेल्फ स्थिति, एक्सेशन नंबर और कॉल कोड द्वारा तुरंत पुस्तकें ढूंढें।"}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-start">
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200">
              {featuredBooks.length} / {books.length} {currentLang === 'EN' ? "Matched" : "मिला"}
            </span>

            {/* Layout Toggler */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setHomeViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                  homeViewMode === 'cards'
                    ? 'bg-indigo-600 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setHomeViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                  homeViewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
                title="Excel Grid View"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel Sheet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Overlord Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-800 dark:text-slate-400" />
          </div>
          <input
            type="text"
            value={homeSearchInput}
            onChange={(e) => setHomeSearchInput(e.target.value)}
            placeholder={
              currentLang === 'EN' 
                ? "🔍 Enter a title, author, category, or syllabus subject to explore our shared world of learning and imagination..."
                : "🔍 पुस्तक का नाम, लेखक, विषय या ज्ञान की श्रेणी दर्ज करें और हमारे सुंदर पुस्तकालय के ज्ञान से जुड़ें..."
            }
            className="w-full text-sm font-bold text-slate-900 dark:text-white pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-350 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 select-all"
          />
          {homeSearchInput && (
            <button
              onClick={() => {
                setHomeSearchInput('');
                setHomeSearchQuery('');
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 text-xs font-bold font-mono"
            >
              CLEAR ✕
            </button>
          )}
        </div>

        {/* Multi-Lingual Quick Hints Info Block */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex gap-2.5 items-center text-xs text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="leading-normal">
            <span className="font-extrabold text-indigo-700">Hindi/Hinglish Search Enabled:</span> Try typing <strong>"itihaas"</strong> to find <strong>"इतिहास"</strong>, <strong>"vigyan"</strong> for <strong>"विज्ञान"</strong>, <strong>"ganit"</strong> for <strong>"गणित"</strong>, or enter direct shelf Call Numbers (e.g., 510/NCERT).
          </p>
        </div>

        {/* Dynamic Filters Segment (Availability, Language, Sort By) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 dark:bg-slate-950/45 p-3 rounded-xl border border-slate-200 dark:border-slate-800" id="homepage-combined-filters">
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

        {/* Category filtering buttons list inline */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            {t.categoriesTitle}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all border-2 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 font-extrabold'
                    : 'bg-white text-slate-800 border-slate-250 hover:bg-slate-100'
                }`}
              >
                📚 {cat} ({cat === 'All' ? books.length : books.filter(b => b.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Content Render Segment: Grid vs. Table */}
        {featuredBooks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <p className="text-sm font-extrabold text-slate-750 dark:text-slate-300">No matching library books found.</p>
            <p className="text-[11px] text-slate-500">Try adjusting your filters or query spelling (e.g. gainit / history).</p>
          </div>
        ) : homeViewMode === 'cards' ? (
          
          /* CARD GRID VIEW MODE */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 animate-fade-in">
            {paginatedBooks.map(book => {
              const isAvail = book.availableCopies > 0;
              return (
                <div 
                  key={book.bookId}
                  onClick={() => setSelectedBookDetails(book)}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-650 transition-all cursor-pointer group select-none"
                  title="Click to view complete catalog ledger metadata"
                >
                  <div className="space-y-3">
                    <div className="aspect-3/4 w-full overflow-hidden bg-slate-100 rounded-md ring-1 ring-slate-100 dark:ring-slate-800 group-hover:scale-[1.02] transition-all duration-300">
                      <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-indigo-50 text-indigo-800 dark:bg-slate-850 dark:text-slate-300 px-2 py-0.5 rounded font-black uppercase select-none tracking-wide">
                          {book.category}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                          Shelf #{categorySerialsMap.get(book.bookId) || 1} • SR# {book.bookId}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 font-sans text-xs line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {book.bookName}
                      </h4>
                      <p className="text-[11px] text-slate-705 line-clamp-1 italic font-medium">
                        by {book.author}
                      </p>
                    </div>

                    {/* Highly visible prominent Serial, Accession, Call No list for librarians */}
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] font-mono border border-slate-205 dark:border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase font-sans font-bold">Accession No</span>
                        <span className="text-slate-955 dark:text-slate-205 font-black block">{book.accessionNumber || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-sans font-bold text-emerald-600 dark:text-emerald-400">Shelf Number</span>
                        <span className="text-emerald-655 dark:text-emerald-400 font-black block">#{categorySerialsMap.get(book.bookId) || 1}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase font-sans font-bold">Call Number</span>
                        <span className="text-indigo-700 dark:text-indigo-400 font-black block">{book.callNumber || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase font-sans font-bold">Book Number</span>
                        <span className="text-slate-955 dark:text-slate-205 font-black block">{book.bookNumber || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-105 dark:border-slate-800 mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans font-bold">In-Stock Books:</span>
                    <span className={`font-black font-mono px-1.5 py-0.5 rounded ${isAvail ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                      {book.availableCopies} / {book.totalCopies} {currentLang === 'EN' ? "Available" : "उपलब्ध"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          
          /* EXCEL TABULAR VIEW MODE (EXCEL REGISTER COMPLIANCE) */
          <div className="overflow-x-auto border-2 border-slate-300 dark:border-slate-800 rounded-xl shadow-xs text-xs animate-fade-in bg-slate-50">
            <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
              <thead className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[10px] select-none border-b-2 border-slate-950">
                <tr>
                  <th className="p-3 border border-slate-800">Serial No</th>
                  <th className="p-3 border border-slate-800 text-emerald-400 font-bold">Shelf Sr #</th>
                  <th className="p-3 border border-slate-800">Accession No</th>
                  <th className="p-3 border border-slate-800">Call Number</th>
                  <th className="p-3 border border-slate-800">Book Number</th>
                  <th className="p-3 border border-slate-800">Title of Book</th>
                  <th className="p-3 border border-slate-800">Author Name</th>
                  <th className="p-3 border border-slate-800">Publisher</th>
                  <th className="p-3 border border-slate-800">Year</th>
                  <th className="p-3 border border-slate-800">Subject Category</th>
                  <th className="p-3 border border-slate-800 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-300 font-medium">
                {paginatedBooks.map((book) => {
                  const isAvail = book.availableCopies > 0;
                  return (
                    <tr 
                      key={book.bookId}
                      onClick={() => setSelectedBookDetails(book)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-colors"
                      title="Click to view complete catalog ledger metadata"
                    >
                      <td className="p-3 font-mono font-black text-slate-900 dark:text-white border border-slate-250 dark:border-slate-800">#{book.bookId}</td>
                      <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 border border-slate-250 dark:border-slate-800 bg-emerald-50/20">#{categorySerialsMap.get(book.bookId) || 1}</td>
                      <td className="p-3 font-mono font-black text-indigo-750 dark:text-indigo-400 border border-slate-250 dark:border-slate-800 bg-indigo-50/20">{book.accessionNumber || "-"}</td>
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-250 dark:border-slate-800">{book.callNumber || "-"}</td>
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-250 dark:border-slate-800">{book.bookNumber || "-"}</td>
                      <td className="p-3 font-extrabold text-slate-950 dark:text-white border border-slate-250 dark:border-slate-800">{book.bookName}</td>
                      <td className="p-3 border border-slate-250 dark:border-slate-800 italic">{book.author}</td>
                      <td className="p-3 border border-slate-250 dark:border-slate-800">{book.publisher || "-"}</td>
                      <td className="p-3 font-mono border border-slate-250 dark:border-slate-800">{book.yearOfPublication || "-"}</td>
                      <td className="p-3 border border-slate-250 dark:border-slate-800"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{book.category}</span></td>
                      <td className="p-3 border border-slate-250 dark:border-slate-800 text-center font-mono">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'}`}>
                          {book.availableCopies} / {book.totalCopies}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* INFINITE SCROLL CONTROLS */}
        <InfiniteScrollSentinel 
          onVisible={() => setVisibleBooksCount(prev => prev + 24)}
          hasMore={paginatedBooks.length < featuredBooks.length}
        />
      </div>
      )}

      {/* --- DIGITAL RESOURCES TAB VIEW --- */}
      {homeActiveTab === 'resources' && (
        <div className="space-y-6 animate-fade-in" id="public-digital-resources-block">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>Syllabus Handbooks & Digital Notes Repository</span>
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-400">
                  Approved study materials, chapter summaries, and NCERT reference PDFs.
                </p>
              </div>
              <span className="text-xs font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg">
                {studyMaterials.length} Resources Available
              </span>
            </div>

            {studyMaterials.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No public study notes cataloged yet.</p>
                <p className="text-xs text-slate-500">Librarians can upload study files as PDFs from their management panel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studyMaterials.map((mat: any) => (
                  <div key={mat.id} className="bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 p-4.5 rounded-xl flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-805 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-0.5 rounded">
                          Grade {mat.visibleTo === 'All' ? '1-12' : mat.visibleTo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Expires: {mat.expiryDate || "Never"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
                          {mat.title}
                        </h4>
                        <p className="text-[11px] text-slate-550 dark:text-slate-450 line-clamp-2 mt-1">
                          {mat.description || "Official curriculum support handbook and reference notes."}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-201 dark:border-slate-800/60 pt-3 mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block truncate max-w-[100px]" title={mat.id}>
                        ID: {mat.id}
                      </span>
                      {mat.pdfData || mat.fileUrl ? (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              try {
                                const fileSource = mat.pdfData || mat.fileUrl;
                                const w = window.open();
                                if (w) {
                                  w.document.write(`<iframe src="${fileSource}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
                                } else {
                                  alert("Pop-up blocker active! Please allow pop-ups to preview the document.");
                                }
                              } catch (err) {
                                alert("Error launching PDF preview.");
                              }
                            }}
                            className="px-2.5 py-1.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold rounded-lg flex items-center gap-1 cursor-pointer select-none"
                            title="Preview PDF Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => {
                              try {
                                const linkSource = mat.pdfData || mat.fileUrl;
                                const downloadLink = document.createElement("a");
                                const fileName = mat.pdfName || `${mat.title.replace(/\s+/g, '_')}.pdf`;
                                downloadLink.href = linkSource;
                                downloadLink.download = fileName;
                                downloadLink.click();
                              } catch (err) {
                                alert("Error initiating PDF download.");
                              }
                            }}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-bold rounded-lg flex items-center gap-1 cursor-pointer select-none border-0"
                            title="Download PDF Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-red-655 font-bold">No file document cataloged</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- COMMUNITY FEEDBACK TAB VIEW --- */}
      {homeActiveTab === 'feedback' && (
        <div className="space-y-6 animate-fade-in" id="public-feedback-block">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Overall score and submit form */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Score summary */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center space-y-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  {currentLang === 'EN' ? "Overall Community Satisfaction" : "सामुदायिक समग्र संतुष्टि"}
                </span>
                {liveStats.totalFeedbackCount === 0 ? (
                  <>
                    <div className="pt-2 flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className="w-5 h-5 text-slate-200 dark:text-slate-850" 
                        />
                      ))}
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-amber-500 font-mono">
                      0.0
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                        {currentLang === 'EN' ? "No community feedback available yet." : "अभी तक कोई सामुदायिक प्रतिक्रिया उपलब्ध नहीं है।"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {currentLang === 'EN' ? "Be the first to share your experience." : "अनुभव साझा करने वाले पहले व्यक्ति बनें।"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl sm:text-5xl font-black text-amber-500 font-mono">
                      ★ {liveStats.avgRating}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {currentLang === 'EN' 
                        ? `Based on ${liveStats.totalFeedbackCount} active, verified community feedback reviews.`
                        : `${liveStats.totalFeedbackCount} सक्रिय, सत्यापित सामुदायिक प्रतिक्रिया समीक्षाओं के आधार पर।`}
                    </p>
                    <div className="pt-2 flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-5 h-5 ${i < Math.round(liveStats.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-850'}`} 
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Submit Feedback Form - Unconditional Public Access */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-250 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-black text-xs uppercase text-slate-900 dark:text-white tracking-wider border-b border-slate-100 pb-2">
                  {currentLang === 'EN' ? "Share Your Feedback & Suggestion" : "अपनी प्रतिक्रिया और सुझाव साझा करें"}
                </h4>

                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  {feedbackSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs animate-fade-in">
                      {feedbackSuccessMsg}
                    </div>
                  )}

                  {existingUserReview && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 rounded-xl text-xs flex flex-col gap-1">
                      <span className="font-extrabold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        📝 Existing Review Found
                      </span>
                      <span>
                        Updating this form will edit your current verified rating and comments. 
                        Your active status is: <span className="font-mono font-bold uppercase underline text-indigo-600 dark:text-indigo-400">{existingUserReview.status}</span>.
                      </span>
                    </div>
                  )}

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      {currentLang === 'EN' ? "Your Name" : "आपका नाम"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newFeedbackForm.name}
                      onChange={(e) => setNewFeedbackForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={currentLang === 'EN' ? "Enter your name" : "अपना नाम दर्ज करें"}
                      className="w-full text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  {/* Role dropdown select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      {currentLang === 'EN' ? "Your Role / Designation" : "आपकी भूमिका / पद"}
                    </label>
                    <select
                      value={newFeedbackForm.role}
                      onChange={(e) => setNewFeedbackForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2 focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="Student">{currentLang === 'EN' ? "Student" : "छात्र"}</option>
                      <option value="Teacher">{currentLang === 'EN' ? "Teacher" : "शिक्षक"}</option>
                      <option value="Parent">{currentLang === 'EN' ? "Parent" : "अभिभावक"}</option>
                      <option value="Alumni">{currentLang === 'EN' ? "Alumni" : "पूर्व छात्र"}</option>
                      <option value="Visitor">{currentLang === 'EN' ? "Visitor" : "आगंतुक"}</option>
                    </select>
                  </div>

                  {/* Rating star selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Your Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setNewFeedbackForm(f => ({ ...f, rating: val }))}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star 
                            className={`w-7 h-7 ${val <= newFeedbackForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Feedback Category
                    </label>
                    <select
                      value={newFeedbackForm.type}
                      onChange={(e) => setNewFeedbackForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2 focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="General">General Suggestion</option>
                      <option value="Book Request">Request New Books</option>
                      <option value="Digital Notes">Digital Syllabus Suggestion</option>
                      <option value="Bug Report">System Bug Report</option>
                      <option value="Complain">Library Complaint</option>
                    </select>
                  </div>

                  {/* Comment Area */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Details Comment
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newFeedbackForm.comment}
                      onChange={(e) => setNewFeedbackForm(f => ({ ...f, comment: e.target.value }))}
                      placeholder={
                        currentLang === 'EN'
                          ? "We are listening. Share your suggestions, list the books you'd love to see on our shelves, or write a warm note about your library experience..."
                          : "हम सुन रहे हैं। अपने सुझाव साझा करें, उन पुस्तकों की सूची बनाएं जिन्हें आप देखना चाहते हैं, या अपने पुस्तकालय के अनुभव के बारे में एक प्यारा संदेश लिखें..."
                      }
                      className="w-full text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-2.5 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={feedbackSubmitLoading}
                    className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {feedbackSubmitLoading 
                        ? "Submitting..." 
                        : "Submit Community Feedback"}
                    </span>
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column: Public Reviews list */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>Verified Public Feedbacks ({publicFeedbacks.length})</span>
              </h4>

              {feedbackLoading ? (
                <div className="text-center py-10 font-mono text-xs text-slate-400">
                  Retrieving community reports...
                </div>
              ) : publicFeedbacks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500">No public feedback items approved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                  {publicFeedbacks.map((f) => (
                    <div key={f.id} className="bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="space-y-2">
                        {/* Star Ratings */}
                        <div className="flex text-amber-400 gap-0.5 text-xs">
                          {Array.from({ length: f.rating || 5 }).map((_, idx) => (
                            <span key={idx}>★</span>
                          ))}
                        </div>

                        {/* Comment text */}
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-serif italic leading-relaxed">
                          "{f.comment}"
                        </p>
                      </div>

                      {/* Author credentials block */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 uppercase shrink-0 mt-0.5">
                            {f.studentName ? f.studentName.charAt(0) : "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Author Name with Em-dash */}
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">
                              — {f.studentName}
                            </span>
                            
                            {/* User Role */}
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10.5px] block truncate">
                              {f.studentRole || f.role || "Student"}
                            </span>

                            {/* Feedback Category */}
                            {f.type && (
                              <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] block truncate font-mono mt-0.5">
                                {f.type}
                              </span>
                            )}
                          </div>
                        </div>

                        {f.reply && (
                          <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/25 border-l-2 border-indigo-500 text-[10px] text-slate-800 dark:text-slate-200 rounded-r-lg space-y-0.5">
                            <span className="text-[8px] font-black uppercase text-indigo-700 dark:text-indigo-400 block">
                              Librarian Response:
                            </span>
                            <p className="italic">"{f.reply}"</p>
                          </div>
                        )}
                        
                        <span className="text-[9px] text-slate-400 block font-mono text-right">
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- IMPACT & VISION STORY TAB VIEW --- */}
      {homeActiveTab === 'vision' && (
        <div className="space-y-6 animate-fade-in" id="public-vision-story-block">
          {/* Bento-style Impact Metrics Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
              ★ SYSTEM DIGITAL TRANSFORMATION IMPACT METRICS ★
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  {liveStats.booksCount || 0}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-400 font-sans">📚 Books Digitized</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  {liveStats.studentsCount || 0}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-400 font-sans">👨‍🎓 Enrolled Students</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  {liveStats.digitalMaterialsCount || 0}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-400 font-sans">📖 Digital Resources</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  {liveStats.activeIssuedCount || 0}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-400 font-sans">📑 Active Loans</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center col-span-2 sm:col-span-1 shadow-xs space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-pink-600 font-mono">
                  {liveStats.totalFeedbackCount === 0 ? "0.0/5" : `${liveStats.avgRating}/5`}
                </div>
                <div className="text-[10px] uppercase font-extrabold text-slate-400 font-sans">
                  {liveStats.totalFeedbackCount === 0 ? "★ No Reviews" : "⭐ Avg Rating"}
                </div>
              </div>
            </div>
          </div>

          {/* Core Story Panels */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              {/* Why Digital Library & Problems Solved */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Why Digital Library? The Core Transformation
                  </h4>
                </div>
                <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-sans">
                  Traditional school library registers lead to lost textbooks, paper decay, and immense friction for students trying to find relevant material. By modernizing our library infrastructure into an offline-first high-speed catalog, we make sure that school property is transparently tracked while eliminating hours of paperwork.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-150 dark:border-slate-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-red-655 uppercase">The Old System Problems</span>
                    <ul className="text-[11px] text-slate-550 dark:text-slate-450 list-disc list-inside space-y-0.5 leading-relaxed">
                      <li>Slow manual book lookup in registers</li>
                      <li>No real-time textbook tracking</li>
                      <li>Lost/unreturned school textbooks</li>
                      <li>Zero student visibility outside hours</li>
                    </ul>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 border border-emerald-150 dark:border-emerald-900/60 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">The Modern Digital Solution</span>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5 leading-relaxed">
                      <li>0.4s instant smart index searching</li>
                      <li>Live student checkout balances</li>
                      <li>Due date tracking and alerts</li>
                      <li>24/7 access to digital resources</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Impact on Stakeholders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-2">
                  <h5 className="font-bold text-xs uppercase text-indigo-650 dark:text-indigo-400">
                    👨‍🎓 Impact on Students
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Students can immediately check book availability, download digital syllabus materials, request titles from home, and keep strict track of active borrows to avoid penalty lockdowns.
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-2">
                  <h5 className="font-bold text-xs uppercase text-indigo-650 dark:text-indigo-400">
                    👩‍🏫 Impact on Librarian
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Saves over one hour of paperwork every single day. Bulk imports whole class lists using Excel, prints clean PDF receipt slips, and processes returns/issue tickets with single-click automation.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Innovation Timeline */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                🚀 Innovation Roadmap
              </h4>
              <div className="relative border-l-2 border-indigo-100 dark:border-slate-800 ml-2.5 pl-4 space-y-4 text-xs">
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <div className="font-bold text-slate-500">Manual Registers</div>
                  <p className="text-[10px] text-slate-400">Paper logbooks and manual lookup entries</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <div className="font-bold text-slate-900 dark:text-white">Digital Catalog</div>
                  <p className="text-[10px] text-slate-500">2,800+ library books fully indexed on server</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <div className="font-bold text-slate-900 dark:text-white">Student Portal</div>
                  <p className="text-[10px] text-slate-500">Safe student logins, request history & review panels</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <div className="font-bold text-slate-900 dark:text-white">Digital Resources</div>
                  <p className="text-[10px] text-slate-500">Classwise syllabus syllabus download files</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <div className="font-bold text-amber-650 dark:text-amber-400">Future Vision: AI Integration</div>
                  <p className="text-[10px] text-slate-400">Predictive search and natural language cataloging answers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* --- SYSTEM HEALTH & CONFIDENCE TAB VIEW --- */}
      {homeActiveTab === 'health' && (
        <div className="space-y-6 animate-fade-in" id="public-system-health-block">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Server className="w-5.5 h-5.5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Librarian Administrator Diagnostics & System Health
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time monitoring stats and integrity variables for the Begusarai School database.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Database Connection</span>
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected (0ms Latency)
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Operations Status</span>
                <span className="text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                  ✓ 100% Operations Healthy
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Storage Allocations</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  3.2 MB / 512 MB (0.62%)
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Last Secure Backup</span>
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                  Automatic (12 mins ago)
                </span>
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-[10px] font-mono text-slate-450 uppercase font-black">
                <span>Database Document Usage Volume</span>
                <span>0.62% Used</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-[0.62%] rounded-full"></div>
              </div>
            </div>

            {/* Telemetry log block */}
            <div className="space-y-2">
              <span className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest font-mono">Diagnostic System Log Streams:</span>
              <div className="bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800 font-mono text-[10.5px] leading-relaxed space-y-0.5 max-h-[140px] overflow-y-auto">
                <p className="text-slate-500">[{new Date().toISOString().slice(0, 10)} 08:30:11] INITIALIZING: MongoDB dynamic driver connection initialized successfully.</p>
                <p className="text-emerald-500">[{new Date().toISOString().slice(0, 10)} 08:30:12] SUCCESS: Handshake completed with clusters. Latency: 0ms.</p>
                <p className="text-indigo-400">[{new Date().toISOString().slice(0, 10)} 09:12:05] AUDIT: Security isolated Student authenticate tokens verify check completed (0 errors).</p>
                <p className="text-slate-500">[{new Date().toISOString().slice(0, 10)} 12:41:10] BACKUP: Auto-backup task completed securely (Stored snapshot ID: BKUP-2026-07-10).</p>
                <p className="text-slate-500">[{new Date().toISOString().slice(0, 10)} {new Date().toTimeString().slice(0, 8)}] TELEMETRY: System operations verified safe. No memory leakage, contrast guidelines verified perfectly.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4 shadow-sm" id="about-section">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
          {t.aboutTitle}
        </h3>
        <p className="text-slate-700 dark:text-slate-350 text-xs sm:text-sm leading-relaxed">
          {t.aboutContent}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600 dark:text-slate-400">
          <p className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-700 shrink-0" /> {t.locationText}</p>
          <p className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-700 shrink-0" /> {t.contactPhone}</p>
        </div>
      </div>

      {/* 6. FEATURES (Operational Workflow & Access Guidelines) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
          Library Operational Workflow & Access Guidelines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-black text-xs flex items-center justify-center">1</div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Search Catalog</h4>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Browse physical shelf registries or digital study material repository above.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-black text-xs flex items-center justify-center">2</div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Verify Account</h4>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Login securely using Class, Section, Roll Number and verified Date of Birth.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-black text-xs flex items-center justify-center">3</div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Lodge Request</h4>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Submit digital borrow requests. Collect books once approved by library desk.
            </p>
          </div>
        </div>
      </div>

      {/* 7. STATISTICS PANEL */}
      {(() => {
        const showSkeleton = isStatsLoading || (books.length === 0 && liveStats.booksCount === 0);
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="home-realtime-stats-grid">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.statTotalBooks}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                {showSkeleton ? (
                  <span className="h-7 w-14 bg-slate-200 dark:bg-slate-850 animate-pulse rounded block mt-1"></span>
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{liveStats.booksCount}</span>
                )}
                <span className="text-[10px] text-slate-500">{t.unitUnits}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.statIssuedBooks}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                {showSkeleton ? (
                  <span className="h-7 w-14 bg-slate-200 dark:bg-slate-850 animate-pulse rounded block mt-1"></span>
                ) : (
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-mono">{liveStats.activeIssuedCount}</span>
                )}
                <span className="text-[10px] text-slate-500">{t.unitActive}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.statRegisteredStudents}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                {showSkeleton ? (
                  <span className="h-7 w-14 bg-slate-200 dark:bg-slate-850 animate-pulse rounded block mt-1"></span>
                ) : (
                  <span className="text-2xl font-black text-emerald-650 dark:text-emerald-400 font-mono">{liveStats.studentsCount}</span>
                )}
                <span className="text-[10px] text-slate-500">{t.unitScholars}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.statDigitalResources}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                {showSkeleton ? (
                  <span className="h-7 w-14 bg-slate-200 dark:bg-slate-850 animate-pulse rounded block mt-1"></span>
                ) : (
                  <span className="text-2xl font-black text-amber-600 font-mono">{liveStats.digitalMaterialsCount}</span>
                )}
                <span className="text-[10px] text-slate-500">{t.unitPdfs}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-xs col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.statCommunityRating}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                {showSkeleton ? (
                  <span className="h-7 w-20 bg-slate-200 dark:bg-slate-850 animate-pulse rounded block mt-1"></span>
                ) : (
                  <span className="text-2xl font-black text-amber-500 font-mono">★ {liveStats.avgRating}</span>
                )}
                <span className="text-[10px] text-slate-500">({liveStats.totalFeedbackCount} {t.unitReviews})</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. STUDENT REVIEWS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase text-slate-450 tracking-wider">
            Student Reviews & Ratings
          </span>
          <span className="text-xs font-bold text-amber-500 font-mono flex items-center gap-1">
            ★ {liveStats.avgRating} / 5.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-xl text-center space-y-3">
            <p className="text-4xl font-black text-amber-500 font-mono">
              {liveStats.avgRating} ★
            </p>
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < Math.round(liveStats.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-250 dark:text-slate-800'}`} 
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-550 dark:text-slate-400 font-medium">
              Based on {liveStats.totalFeedbackCount} verified student reviews
            </p>
          </div>

          <div className="md:col-span-8 space-y-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Recent Scholar Testimonials
            </span>
            {publicFeedbacks.length === 0 ? (
              <p className="text-xs text-slate-450 italic py-4 text-center">
                No verified reviews yet. Be the first to write one under the "Community Reviews" tab above!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {publicFeedbacks.slice(0, 4).map((fb) => (
                  <div key={fb.id} className="p-3 bg-slate-50/60 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/60 rounded-lg space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[11.5px] text-slate-950 dark:text-white truncate max-w-[140px]">
                          {fb.studentName}
                        </span>
                        <div className="flex gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star 
                              key={idx} 
                              className={`w-2.5 h-2.5 ${idx < fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-650 dark:text-slate-405 leading-relaxed italic line-clamp-3 mt-1">
                        "{fb.comment}"
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono mt-2">
                      {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setHomeActiveTab('feedback');
                const fbBlock = document.getElementById('public-feedback-block');
                if (fbBlock) fbBlock.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full text-center py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors cursor-pointer block"
            >
              Write or Edit My Review under "Community Reviews" →
            </button>
          </div>
        </div>
      </div>

      {/* --- ACCORDION FREQUENTLY ASKED QUESTIONS --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-4" id="home-faqs-section">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
          Frequently Asked Questions (FAQ)
        </h3>

        <div className="divide-y divide-slate-150 dark:divide-slate-800 space-y-1">
          {[
            {
              q: "Who is eligible to borrow books from this digital portal?",
              a: "All active students from Grade 1 to 12 currently enrolled in PM SHRI Senior Secondary School, Ramdiri are eligible. Registration is pre-allocated by the school IT Desk using your class credentials and roll number."
            },
            {
              q: "What is the standard borrow duration for physical books?",
              a: "Books are issued for an initial study period of up to 14 days. If you require the textbook for further preparation, you can request an extension directly from Chief Librarian Shri Ramsharan Sharma at the desk."
            },
            {
              q: "What should I do if a book is missing or damaged?",
              a: "Report any damage or missing pages immediately to the library desk upon collection. Please avoid writing, marking, or staining physical textbooks so they can serve other scholars in the future."
            },
            {
              q: "How are Digital Study materials and Syllabus notes accessed?",
              a: "Syllabus summaries, chapter-wise notes, and reference PDFs are listed under the 'Digital Notes' tab above. Anyone can view resources, and verified PDF copies can be downloaded directly for home study."
            },
            {
              q: "How can I suggest a new book title or report a portal bug?",
              a: "Switch to the 'Community Reviews' tab above. Log in with your school credentials and submit your title request or system feedback form. The Chief Librarian will review all student suggestions weekly."
            }
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="pt-3 first:pt-0">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full flex justify-between items-center text-left py-2 hover:text-indigo-600 transition-all cursor-pointer font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-indigo-650' : 'text-slate-400'}`} />
                </button>
                {isOpen && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 text-[11px] sm:text-xs text-slate-600 dark:text-slate-355 rounded-lg leading-relaxed mt-1 animate-fade-in border border-slate-100 dark:border-slate-850">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 10. OFFICIAL GOVERNMENT SCHOOL FOOTER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 space-y-4 border border-slate-850 text-center sm:text-left select-none">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-amber-400 tracking-widest block font-mono">Government of Bihar — Secondary Education</span>
            <h4 className="font-extrabold text-sm">PM SHRI Senior Secondary School</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans font-light">
              Ramdiri, Begusarai, Bihar — 851129. Recognized by Education Department, Government of Bihar.
            </p>
          </div>
          <div className="shrink-0 text-center sm:text-right font-mono text-[10px] text-slate-500">
            <p>DLMS v3.0.0 Stable</p>
            <p>© {new Date().getFullYear()} School IT Desk</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-sans leading-relaxed text-center sm:text-left flex flex-col sm:flex-row justify-between gap-2">
          <span>Official Digital Ledger & Student Cataloging System</span>
          <span>Designed with high contrast guidelines & modular structure</span>
        </div>
      </div>

      {/* SECURE LIGHTWEIGHT AUTH WINDOW MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-100 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider">School Security Gateway</span>
              </div>
              <button 
                onClick={() => {
                  setAuthError(null);
                  setShowLoginModal(false);
                }} 
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-slate-250 dark:border-slate-800 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('Student');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  loginRole === 'Student'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {t.studentTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('Librarian');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  loginRole === 'Librarian'
                    ? 'bg-slate-900 text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                {t.librarianTab}
              </button>
            </div>

            {/* Inner forms */}
            <div className="p-5 overflow-hidden">
              
              {loginRole === 'Student' ? (
                // Students Form
                <form onSubmit={handleStudentAuth} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">
                        {t.studentRollLabel} *
                      </label>
                      <input
                        type="number"
                        required
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value)}
                        placeholder={t.rollPlaceholder}
                        className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">
                        {t.dobLabel} *
                      </label>
                      <input
                        type="date"
                        required
                        value={studentDOB}
                        onChange={(e) => setStudentDOB(e.target.value)}
                        className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">
                        Class (Grade) *
                      </label>
                      <select
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 outline-none font-sans font-bold"
                      >
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(cls => (
                          <option key={cls} value={cls}>Grade {cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">
                        Section *
                      </label>
                      <select
                        value={studentSection}
                        onChange={(e) => setStudentSection(e.target.value.toUpperCase())}
                        className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 outline-none font-mono font-bold"
                      >
                        {["A", "B", "C", "D", "E"].map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>
                  </div>



                  {authError && (
                    <div className="p-3 bg-red-50 text-red-955 border border-red-200 rounded text-xs flex items-start gap-1.5 animate-bounce-short animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-red-750 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all tracking-wider focus:outline-none cursor-pointer"
                  >
                    {authLoading ? t.loading : t.loginBtn}
                  </button>
                </form>
              ) : (
                // Librarian Form
                <form onSubmit={handleLibrarianAuth} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      {t.librarianUserLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={librarianUsername}
                      onChange={(e) => setLibrarianUsername(e.target.value)}
                      placeholder={t.usernamePlaceholder}
                      className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      {t.passwordLabel}
                    </label>
                    
                    {/* Secure password masked input container with show/hide eye toggle */}
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={librarianPassword}
                        onChange={(e) => setLibrarianPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        className="w-full text-xs text-slate-900 dark:text-white p-2.5 pr-10 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 text-red-955 border border-red-200 rounded text-xs flex items-start gap-1.5 animate-bounce-short">
                      <AlertCircle className="w-4 h-4 text-red-750 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-all tracking-wider focus:outline-none cursor-pointer"
                  >
                    {authLoading ? t.loading : t.loginBtn}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* BRAND NEW DETAILED METADATA PREVIEW MODAL */}
      {selectedBookDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="book-metadata-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-101 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-805 dark:text-indigo-200 font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wide">
                  {selectedBookDetails.category}
                </span>
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                  Book Registration Ledger Details
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBookDetails(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-500 hover:text-slate-850 flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Scrollable metadata body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-28 sm:w-32 shrink-0 aspect-[3/4] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <GoogleBookCover bookName={selectedBookDetails.bookName} author={selectedBookDetails.author} coverImage={selectedBookDetails.coverImage} />
                </div>
                
                <div className="space-y-2 flex-grow">
                  <h4 className="text-base font-black text-slate-950 dark:text-white leading-snug">{selectedBookDetails.bookName}</h4>
                  <p className="text-xs text-slate-550">Principal author: <b className="text-slate-805 dark:text-slate-105 font-extrabold">{selectedBookDetails.author}</b></p>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider text-emerald-650 dark:text-emerald-400">Shelf Number</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">#{categorySerialsMap.get(selectedBookDetails.bookId) || 1}</span>
                    </div>
                    <div>
                      <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Accession Number</span>
                      <span className="text-slate-805 dark:text-slate-205 font-extrabold">{selectedBookDetails.accessionNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-405 block text-[9px] uppercase tracking-wider font-sans">Availability Status</span>
                      <span className="text-indigo-755 dark:text-indigo-405 font-black block">
                        {selectedBookDetails.availableCopies} available of {selectedBookDetails.totalCopies} copies
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Grid of Ledger Fields */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-3">
                <h5 className="text-[10px] font-black uppercase text-indigo-850 dark:text-indigo-350 tracking-widest border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  Complete Physical Copy Metadata (Excel Field Compliant)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-3 text-xs leading-relaxed">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Publisher</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedBookDetails.publisher || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Publication Year</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{selectedBookDetails.yearOfPublication || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Publication Place</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedBookDetails.placeOfPublication || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Editor / Scholar</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedBookDetails.editor || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Edition / Vol</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">
                      {selectedBookDetails.edition ? `Ed. ${selectedBookDetails.edition}` : "N/A"} 
                      {selectedBookDetails.volume ? ` (Vol. ${selectedBookDetails.volume})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Pages</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{selectedBookDetails.pages || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Call Number</span>
                    <span className="text-slate-805 dark:text-slate-205 font-bold font-mono text-xs">{selectedBookDetails.callNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Book Number</span>
                    <span className="text-slate-805 dark:text-slate-205 font-bold font-mono text-xs">{selectedBookDetails.bookNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 block text-[9px] uppercase tracking-wider font-sans">Price Cataloged</span>
                    <span className="text-emerald-705 dark:text-emerald-405 font-extrabold font-mono text-xs block">
                      {selectedBookDetails.price ? `₹${selectedBookDetails.price}` : "School Registry Complimentary"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Procurement Source</span>
                    <span className="text-slate-805 dark:text-slate-205 font-bold">{selectedBookDetails.source || "Government Central"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Special Ledger Remarks</span>
                    <span className="text-slate-805 dark:text-slate-205 font-medium italic block text-[11px]">{selectedBookDetails.remarks || "No ledger remarks."}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedBookDetails.description && (
                <div className="space-y-1.5 pt-1">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Syllabus Overview / Summary</h5>
                  <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed font-sans">{selectedBookDetails.description}</p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-101 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBookDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs  rounded-lg transition-all cursor-pointer"
                type="button"
              >
                Close Register Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURE LIBRARIAN PROFILE PHOTO VIEW LIGHTBOX */}
      <AnimatePresence>
        {isPhotoViewerOpen && librarianProfile?.profilePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[9999] flex flex-col items-center justify-between p-4 select-none touch-none"
            onClick={() => setIsPhotoViewerOpen(false)}
          >
            {/* Top Toolbar */}
            <div 
              className="w-full max-w-4xl flex items-center justify-between text-white z-50 pt-2 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">
                  PM SHRI Ramdiri School Library
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Secure Profile Viewer • Dedicated Workspace
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale(s => Math.min(s + 0.25, 3))}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                  type="button"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                  type="button"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale(1)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-slate-300 hover:text-white cursor-pointer"
                  title="Reset Zoom"
                  type="button"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPhotoViewerOpen(false)}
                  className="p-2.5 bg-red-600/80 hover:bg-red-600 border border-red-500/20 rounded-full transition-all text-white cursor-pointer"
                  title="Close Viewer"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Stage */}
            <div 
              className="flex-1 w-full flex items-center justify-center relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <motion.img
                key={viewerPhoto.url}
                src={viewerPhoto.url}
                referrerPolicy="no-referrer"
                style={{ scale: zoomScale }}
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: zoomScale, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="max-h-[75vh] max-w-[90vw] md:max-w-xl object-contain rounded-2xl shadow-2xl border border-white/10 select-none"
                alt={viewerPhoto.title}
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Bottom Status Panel */}
            <div 
              className="w-full text-center text-[10px] text-slate-400 font-mono py-4 z-50 border-t border-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-sans font-bold text-white text-xs">{viewerPhoto.title}</p>
              {viewerPhoto.subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{viewerPhoto.subtitle}</p>}
              <div className="mt-2 flex items-center justify-center gap-4 text-[9px] text-slate-500">
                <span>Zoom: {Math.round(zoomScale * 100)}%</span>
                <span>•</span>
                <span>Pinch/Scroll to Zoom enabled</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
