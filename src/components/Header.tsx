/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BookOpen, User, Languages, Eye, Type, Shield, Bell, Check, Trash2, X, LogOut, Key } from 'lucide-react';
import { translations } from '../localization';
import { UserRole } from '../types';

interface HeaderProps {
  currentRole: UserRole | 'Guest';
  loggedInName?: string;
  currentLang: 'EN' | 'HI';
  onLangChange: (lang: 'EN' | 'HI') => void;
  highContrast: boolean;
  onContrastToggle: () => void;
  fontSizeLarge: boolean;
  onFontSizeToggle: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  onTriggerLoginClick: () => void;
}

export default function Header({
  currentRole,
  loggedInName,
  currentLang,
  onLangChange,
  highContrast,
  onContrastToggle,
  fontSizeLarge,
  onFontSizeToggle,
  isLoggedIn,
  onLogout,
  onTriggerLoginClick
}: HeaderProps) {
  const t = translations[currentLang];
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Filtered notifications specifically for general school updates
  const notices = [
    { id: "1", title: "NCERT Class 10 Syllabus Book Restocked", msg: "Mathematics Part-1 copies shelved.", date: "Just now" },
    { id: "2", title: "Monthly Inventory Audit", msg: "Librarians please verify book counts before the 25th.", date: "Today" }
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all relative z-20 shrink-0" id="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & School Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#0d4d2d] border border-emerald-605 flex items-center justify-center shrink-0 shadow-xs select-none">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                  BSEB Code: BEG-52031
                </span>
                {isLoggedIn && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                    currentRole === 'Librarian' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-950'
                  }`}>
                    {currentRole === 'Librarian' ? (currentLang === 'HI' ? "पुस्तकालयाध्यक्ष" : "Librarian") : (currentLang === 'HI' ? "छात्र" : "Student")}
                  </span>
                )}
              </div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                {t.schoolName}
              </h1>
              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1 leading-none mt-0.5">
                <span>📍 {t.location}</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-800 font-bold">{t.subtitle}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & System Controls Widget */}
          <div className="ml-auto sm:ml-0 flex flex-wrap items-center gap-2.5 select-none text-xs">
            
            {/* Lang switcher */}
            <div className="flex items-center border border-slate-205 rounded bg-slate-50 p-0.5">
              <button
                onClick={() => onLangChange('EN')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  currentLang === 'EN'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => onLangChange('HI')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  currentLang === 'HI'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label="हिन्दी में बदलें"
              >
                हिन्दी
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative inline-block text-left">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-1.5 rounded border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-650 flex items-center gap-1"
                aria-label="Notices"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentLang === 'EN' ? "Notices" : "सूचनाएं"}</span>
                <span className="w-2 h-2 rounded-full bg-orange-500 block"></span>
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50 text-slate-800 font-sans">
                  <div className="bg-slate-950 text-white p-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>School Board Desk Notice</span>
                  </div>
                  <div className="divide-y divide-slate-150 max-h-48 overflow-y-auto">
                    {notices.map(n => (
                      <div key={n.id} className="p-2.5 text-[11px] space-y-0.5 hover:bg-slate-50">
                        <p className="font-bold text-slate-900">{n.title}</p>
                        <p className="text-slate-500 font-light leading-relaxed">{n.msg}</p>
                        <span className="text-[9px] text-slate-400 block font-mono">{n.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contrast adjust */}
            <button
              onClick={onContrastToggle}
              className={`p-1.5 rounded border text-[11px] font-bold flex items-center gap-1 transition-all ${
                highContrast ? 'bg-[#ff9800] border-amber-600 text-slate-950' : 'border-slate-200 bg-slate-50/40 text-slate-650'
              }`}
              title="Toggle Accessibility Contrast"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Contrast</span>
            </button>

            {/* Sizing adjust */}
            <button
              onClick={onFontSizeToggle}
              className={`p-1.5 rounded border text-[11px] font-bold flex items-center gap-1 transition-all ${
                fontSizeLarge ? 'bg-teal-700 text-white border-teal-800' : 'border-slate-200 bg-slate-50/40 text-slate-650'
              }`}
              title="Toggle Sizing Scale"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Text Size</span>
            </button>

            <div className="h-6 w-px bg-slate-250 mx-1"></div>

            {/* Right Authenticated profile / sign out */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-1 rounded hidden sm:inline-block border">
                  👤 {loggedInName}
                </span>

                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                  title="Logout Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onTriggerLoginClick}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded flex items-center gap-1 cursor-pointer transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
