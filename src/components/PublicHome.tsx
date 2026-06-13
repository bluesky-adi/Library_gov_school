/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Book, Student } from '../types';
import { 
  BookOpen, Award, GraduationCap, MapPin, 
  Phone, Mail, Calendar, Key, Shield, User, X, CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';

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

  // Librarian Login Fields
  const [librarianUsername, setLibrarianUsername] = useState<string>('');
  const [librarianPassword, setLibrarianPassword] = useState<string>('');

  // Validation States
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Generate distinct category filters
  const categoriesList = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  // Pick top 4 featured books
  const featuredBooks = books.slice(0, 4);

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
      contactMail: "admin@ramdirihighschool.bihar.gov.in"
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
      contactMail: "admin@ramdirihighschool.bihar.gov.in"
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
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer tracking-wider hover:shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
              id="home-trigger-login-btn"
            >
              <Key className="w-4 h-4 text-slate-950" />
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
                className="px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded shadow tracking-wide"
              >
                Access Account Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Featured Book Catalog Register */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700 font-bold" />
            <span>{t.featuredHeadline}</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Showing {featuredBooks.length} High-Ranked</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredBooks.map(book => {
            const isAvail = book.availableCopies > 0;
            return (
              <div 
                key={book.bookId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-3.5">
                  <div className="aspect-3/4 w-full overflow-hidden bg-slate-100 rounded-md">
                    <GoogleBookCover bookName={book.bookName} author={book.author} coverImage={book.coverImage} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-500 font-extrabold uppercase select-none tracking-wide">
                      {book.category}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 font-sans text-xs line-clamp-1">
                      {book.bookName}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      by {book.author}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-sans">Available Copies:</span>
                  <span className={`font-extrabold font-mono ${isAvail ? 'text-slate-800 dark:text-slate-200' : 'text-red-600'}`}>
                    {book.availableCopies} / {book.totalCopies}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory Categories Roster */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
        <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
          {t.categoriesTitle}
        </h3>
        <div className="flex flex-wrap gap-2">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📚 {cat} ({cat === 'All' ? books.length : books.filter(b => b.category === cat).length})
            </button>
          ))}
        </div>

        {selectedCategory !== 'All' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 animate-fade-in">
            {books.filter(b => b.category === selectedCategory).slice(0, 6).map(b => (
              <div key={b.bookId} className="flex p-2.5 bg-white border border-slate-150 rounded-lg text-xs gap-3">
                <div className="font-bold text-slate-800 font-mono">B0{b.bookId.slice(-2)}</div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{b.bookName}</div>
                  <div className="text-[10px] text-slate-500">by {b.author}</div>
                </div>
              </div>
            ))}
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
          <div className="border-t border-slate-200 pt-3 mt-4 text-[10.5px] text-slate-500 text-slate-600">
            <p className="font-bold">Ramdiri Admissions Unit</p>
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
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider">Ramdiri Auth Node</span>
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
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      {t.studentRollLabel}
                    </label>
                    <input
                      type="number"
                      required
                      value={studentRoll}
                      onChange={(e) => setStudentRoll(e.target.value)}
                      placeholder={t.rollPlaceholder}
                      className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      {t.dobLabel}
                    </label>
                    <input
                      type="date"
                      required
                      value={studentDOB}
                      onChange={(e) => setStudentDOB(e.target.value)}
                      className="w-full text-xs text-slate-900 dark:text-white p-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:ring-1 focus:ring-slate-800 outline-none"
                    />
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

    </div>
  );
}
