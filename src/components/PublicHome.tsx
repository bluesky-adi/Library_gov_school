/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Book, Student } from '../types';
import { 
  BookOpen, Award, GraduationCap, MapPin, 
  Phone, Mail, Calendar, Key, Shield, User, X, CheckCircle, AlertCircle, Eye, EyeOff,
  Search, LayoutGrid, Table, Info
} from 'lucide-react';
import { searchBooksSmart } from '../lib/searchUtils';

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
  onLoginSuccess: (role: 'Student' | 'Librarian', student?: Student) => void;
  isLoggedIn: boolean;
  loggedInUserLabel: string;
  onLogout: () => void;
  onNavigatePortal: () => void;
}

export default function PublicHome({
  currentLang,
  books,
  students,
  onLoginSuccess,
  isLoggedIn,
  loggedInUserLabel,
  onLogout,
  onNavigatePortal
}: PublicHomeProps) {
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

  // Filter books dynamically based on category tab selection and search query
  const filteredFeaturedBooks = React.useMemo(() => {
    let result = [...books];
    // Numeric sorting by real database/serial bookId to avoid string sorting anomalies (e.g. 1, 10, 2)
    result.sort((a, b) => {
      const idA = parseInt(a.bookId.replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(b.bookId.replace(/\D/g, ''), 10) || 0;
      if (idA !== idB) return idA - idB;
      return a.bookId.localeCompare(b.bookId, undefined, { numeric: true });
    });

    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }
    return searchBooksSmart(result, homeSearchQuery);
  }, [books, selectedCategory, homeSearchQuery]);

  const featuredBooks = filteredFeaturedBooks;

  // Optimizing and paginating the book list for immediate under-100ms response on over 2605+ books
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 16;

  // Reset page when search query or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, homeSearchQuery]);

  const totalPages = Math.ceil(featuredBooks.length / itemsPerPage);

  const paginatedBooks = React.useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return featuredBooks.slice(startIdx, startIdx + itemsPerPage);
  }, [featuredBooks, currentPage]);

  const t = {
    EN: {
      dlmsTitle: "Digital Library Management System",
      welcomeBanner: "PM SHRI Ramdiri +2 High School Library",
      subTitleText: "Under the Pradhan Mantri Schools for Rising India (PM SHRI) Initiative",
      established: "BSEB PATNA AFFILIATED • PM SHRI PARTNER SCHOOL",
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
      aboutContent: "PM SHRI Ramdiri +2 High School, located in the historical district of Begusarai, Bihar, is a state-supported senior secondary high school selected under the PM SHRI initiative. Developed by the Ministry of Education, PM SHRI schools showcase leadership, high educational standards, and modern digital tooling like this automated Library Portal to foster reading, academic focus, and student growth.",
      locationText: "Ramdiri Village, Begusarai District, Bihar - 851129",
      contactPhone: "+91-6243-245102 (BSEB Begusarai Office)",
      contactMail: "library@ramdirihighschool.bihar.gov.in"
    },
    HI: {
      dlmsTitle: "डिजिटल पुस्तकालय प्रबंधन प्रणाली",
      welcomeBanner: "पीएम श्री रामदीरी +2 उच्च विद्यालय पुस्तकालय",
      subTitleText: "प्रधान मंत्री स्कूल्स फॉर राइजिंग इंडिया (PM SHRI) पहल के अंतर्गत",
      established: "बिहार विद्यालय परीक्षा समिति संबद्ध • पीएम श्री मॉडल स्कूल",
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
      aboutContent: "पीएम श्री रामदीरी +2 उच्च विद्यालय, बेगूसराय, बिहार के ऐतिहासिक क्षेत्र में स्थित एक प्रमुख माध्यमिक एवं उच्चतर माध्यमिक विद्यालय है, जिसे भारत सरकार की पीएम श्री (PM SHRI) योजना के तहत चयनित किया गया है। पीएम श्री पहल के तहत उन्नत और उत्कृष्ट शैक्षिक मानकों का प्रदर्शन करते हुए, यह स्वचालित डिजिटल पुस्तकालय पोर्टल छात्रों में अध्ययनशीलता को बढ़ावा देने और सुगम पुस्तकालय संचालन को सुनिश्चित करने के लिए कार्यरत है।",
      locationText: "ग्राम - रामदीरी, बेगूसराय जिला, बिहार - 851129",
      contactPhone: "+91-6243-245102 (बेगूसराय शिक्षा कार्यालय)",
      contactMail: "library@ramdirihighschool.bihar.gov.in"
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
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 font-extrabold shadow-inner shrink-0 select-none">
            <GraduationCap className="w-8 h-8 text-slate-700" />
          </div>
          <div>
            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider leading-none">
              {t.established}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-tight">
              {t.welcomeBanner}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-wide">
              {t.dlmsTitle} • {t.subTitleText}
            </p>
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

      {/* Hero Announcement Block */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-6 sm:p-10 rounded-2xl shadow-md relative border border-slate-700">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block font-mono">★★ Begusarai District Scholars Portal ★★</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Connecting Tradition with Technology
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

      {/* Unified Book Catalog Register & Search Engine */}
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
                ? "🔍 Search by Title, Author, Accession No, Call Number, Publisher or Hinglish terms (e.g. vigyan, itihaas, ganit)..."
                : "🔍 पुस्तक का नाम, लेखक, एक्सेशन नंबर, कॉल कोड या हिन्दी/हिंग्लिश शब्दों द्वारा खोजें..."
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

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 gap-4">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              Page {currentPage} of {totalPages} ({featuredBooks.length} books total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none select-none transition-colors dark:border-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-bold border-2 transition-colors ${
                        currentPage === pageNum
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:bg-slate-105 text-slate-700 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-300 dark:hover:bg-slate-800'
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none select-none transition-colors dark:border-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About & Principal desk segment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="about-section">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-3">
          <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider pb-1 border-b border-slate-100">
            {t.aboutTitle}
          </h3>
          <p className="text-slate-700 dark:text-slate-350 text-xs sm:text-sm leading-relaxed">
            {t.aboutContent}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600">
            <p className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-700" /> {t.locationText}</p>
            <p className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-700" /> {t.contactPhone}</p>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-100 p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-700 tracking-widest block font-mono">Administrative Contact</span>
            <p className="text-xs text-slate-700 italic">
              "For student records update or new batch entries schedules, please coordinates directly with the Principal's Room."
            </p>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 text-[10.5px] text-slate-600">
            <p className="font-extrabold text-slate-800">School Library Support Desk</p>
            <p className="font-mono">{t.contactMail}</p>
          </div>
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

    </div>
  );
}
