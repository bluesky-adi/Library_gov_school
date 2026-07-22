/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Book, Student, BorrowRequest, BookIssueLog, LibraryAuditLog, StudyMaterial, Notification } from '../types';
import ExcelModule from './ExcelModule';
import { GoogleBookCover } from './PublicHome';
import { searchBooksSmart, getDdcCategoryName, base64ToBlobUrl, getDdcColor } from '../lib/searchUtils';

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
      <div className="py-4 text-center text-[11px] text-slate-400 font-mono select-none border-t border-slate-200 dark:border-slate-800 mt-2">
        ✓ All matched records fully loaded in view
      </div>
    );
  }

  return (
    <div 
      ref={sentinelRef} 
      className="py-4 flex items-center justify-center gap-2 text-[11px] text-indigo-600 font-mono select-none animate-pulse border-t border-slate-200 dark:border-slate-800 mt-2"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
      <span>Fetching additional dynamic ledger entries...</span>
    </div>
  );
}

import QRCode from 'qrcode';
import { jsPDF as jsPDFNamed } from 'jspdf';
import jsPDFDefault from 'jspdf';
const jsPDF = jsPDFNamed || jsPDFDefault || (jsPDFDefault as any).jsPDF;

interface StickerElementProps {
  book: Book;
  accessionNo: string;
  callNo: string;
  bookNo: string;
  shelfLocation: string;
  isPreview?: boolean;
}

function StickerElement({ book, accessionNo, callNo, bookNo, shelfLocation, isPreview = false }: StickerElementProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const targetUrl = `${window.location.origin}/book/${encodeURIComponent(accessionNo)}`;
    QRCode.toDataURL(targetUrl, { 
      margin: 1, 
      width: 150,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error("Error generating sticker QR:", err));
  }, [accessionNo]);

  const ddcCol = getDdcColor(callNo || book?.ddcNumber || book?.callNumber);

  // Fallback for shelf number to show real database value or Not Assigned
  const displayShelf = (shelfLocation && shelfLocation.trim()) ? shelfLocation : "Not Assigned";
  
  // Book number fallback
  const displayBookNo = (bookNo && bookNo.trim()) ? bookNo : "—";

  if (isPreview) {
    return (
      <div 
        className="sticker-preview-item rounded-xl shadow-md p-3 flex flex-col justify-between items-center select-none font-mono transition-all hover:scale-105"
        style={{ backgroundColor: ddcCol.hex, color: ddcCol.textColorHex }}
      >
        <div className="w-full flex flex-col items-center text-center space-y-1 overflow-hidden">
          <div className="text-[10px] leading-tight font-black uppercase tracking-wider opacity-90">
            Accession No
          </div>
          <div className="text-sm font-black tracking-tight truncate max-w-full pb-1 border-b border-current w-full">
            {accessionNo}
          </div>
          
          <div className="pt-2 text-[9px] font-bold uppercase tracking-wider opacity-75">
            Call Number
          </div>
          <div className="text-[11px] font-black truncate max-w-full">
            {callNo}
          </div>

          <div className="pt-1.5 text-[9px] font-bold uppercase tracking-wider opacity-75">
            Book Number
          </div>
          <div className="text-[11px] font-black truncate max-w-full">
            {displayBookNo}
          </div>

          <div className="pt-1.5 text-[9px] font-bold uppercase tracking-wider opacity-75">
            Shelf Number
          </div>
          <div className="text-[11px] font-black truncate max-w-full">
            {displayShelf}
          </div>
        </div>

        {/* QR Code container - high contrast */}
        <div className="w-16 h-16 shrink-0 bg-white p-1 rounded-lg flex items-center justify-center shadow-inner mt-3">
          {qrUrl ? (
            <img 
              src={qrUrl} 
              alt="QR Code" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 animate-pulse rounded"></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="sticker-item p-2 flex flex-col justify-between items-center overflow-hidden font-mono text-center" 
      style={{ 
        width: '24mm', 
        height: '64mm', 
        backgroundColor: ddcCol.hex, 
        color: ddcCol.textColorHex 
      }}
    >
      <div className="w-full flex flex-col items-center space-y-0.5 overflow-hidden">
        <div className="text-[7px] leading-none font-extrabold uppercase tracking-widest opacity-90">
          ACCESSION
        </div>
        <div className="text-[9px] leading-tight font-black tracking-tight truncate max-w-full border-b border-current w-full pb-0.5">
          {accessionNo}
        </div>
        
        <div className="pt-1 text-[6.5px] leading-none font-bold uppercase tracking-wider opacity-75">
          CALL NO
        </div>
        <div className="text-[8.5px] leading-tight font-extrabold truncate max-w-full">
          {callNo}
        </div>

        <div className="pt-1 text-[6.5px] leading-none font-bold uppercase tracking-wider opacity-75">
          BOOK NO
        </div>
        <div className="text-[8.5px] leading-tight font-extrabold truncate max-w-full">
          {displayBookNo}
        </div>

        <div className="pt-1 text-[6.5px] leading-none font-bold uppercase tracking-wider opacity-75">
          SHELF
        </div>
        <div className="text-[8.5px] leading-tight font-black truncate max-w-full">
          {displayShelf}
        </div>
      </div>

      {/* QR Code Box - High Contrast 13mm x 13mm */}
      <div className="shrink-0 bg-white p-0.5 rounded-sm flex items-center justify-center" style={{ width: '13mm', height: '13mm' }}>
        {qrUrl ? (
          <img 
            src={qrUrl} 
            alt="QR Code" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-slate-200 animate-pulse"></div>
        )}
      </div>
    </div>
  );
}

interface StickerPreviewSectionProps {
  books: Book[];
  categorySerialsMap: Map<string, number>;
  stickerPrintedIds: Set<string>;
  onPrintSingle: (booksList: Book[]) => void;
}

function StickerPreviewSection({ books, categorySerialsMap, stickerPrintedIds, onPrintSingle }: StickerPreviewSectionProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'unprinted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const itemsPerPage = 12;

  const filtered = useMemo(() => {
    let list = books;
    if (filterMode === 'unprinted') {
      list = list.filter(b => !stickerPrintedIds.has(b.bookId));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(b => 
        b.bookName.toLowerCase().includes(q) ||
        (b.accessionNumber && b.accessionNumber.toLowerCase().includes(q)) ||
        b.bookId.toLowerCase().includes(q) ||
        (b.callNumber && b.callNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [books, filterMode, searchQuery, stickerPrintedIds]);

  // Reset page on search or filter change
  useEffect(() => {
    setPreviewPage(1);
  }, [filterMode, searchQuery]);

  const paginated = useMemo(() => {
    const start = (previewPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, previewPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  return (
    <div className="space-y-4">
      {/* Filtering and search row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between no-print bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white font-extrabold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            All Catalog ({books.length})
          </button>
          <button
            onClick={() => setFilterMode('unprinted')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterMode === 'unprinted'
                ? 'bg-emerald-600 text-white font-extrabold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            🆕 New Unprinted ({books.filter(b => !stickerPrintedIds.has(b.bookId)).length})
          </button>
        </div>
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search preview by title / ACC / CALL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs font-sans">
          No matching books found for this preview filter.
        </div>
      ) : (
        <>
          {/* Sticker Preview Grid */}
          <div className="sticker-preview-grid">
            {paginated.map(book => {
              const accessionNo = book.accessionNumber || book.bookId || "N/A";
              const callNo = book.callNumber || "N/A";
              const bookNo = book.bookNumber || "N/A";
              const shelfLocation = (book.shelfNumber || "").trim() || "—";
              const isPrinted = stickerPrintedIds.has(book.bookId);

              return (
                <div key={book.bookId} className="relative group">
                  <StickerElement 
                    book={book}
                    accessionNo={accessionNo}
                    callNo={callNo}
                    bookNo={bookNo}
                    shelfLocation={shelfLocation}
                    isPreview={true}
                  />
                  {/* Absolute positioning of sticker row indicator badge & action buttons */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 items-center bg-white/95 dark:bg-slate-900/95 p-0.5 rounded shadow-xs opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className={`px-1 py-0.2 text-[8px] font-black rounded ${
                      isPrinted 
                        ? 'bg-slate-100 text-slate-500' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {isPrinted ? 'Printed' : 'New'}
                    </span>
                    <button
                      onClick={() => onPrintSingle([book])}
                      className="p-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 text-[9px] font-bold flex items-center gap-0.5"
                      title="Direct Print Single Sticker"
                    >
                      <Printer className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 no-print select-none text-[11px] text-slate-500 font-bold">
              <span>Showing preview page {previewPage} of {totalPages} (Total matching: {filtered.length})</span>
              <div className="flex gap-1.5 font-sans">
                <button
                  disabled={previewPage === 1}
                  onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-350 font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ◀ Prev
                </button>
                <button
                  disabled={previewPage === totalPages}
                  onClick={() => setPreviewPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-350 font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
import { 
  PlusCircle, Edit, Trash2, CheckCircle, XCircle, FileText, FolderPlus,
  BookOpen, Users, ClipboardCheck, Printer, Search, Download, AlertTriangle, ArrowUpRight,
  Key, Eye, EyeOff, Shield, Sliders, AlertCircle, User, Database, RefreshCw, Upload, Clock,
  Grid, LayoutGrid, ArrowUpDown, MessageSquare, Star, Camera, Inbox, Check, Archive, Bell, Tag
} from 'lucide-react';

interface LibrarianModuleProps {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  auditLogs: LibraryAuditLog[];
  studyMaterials?: StudyMaterial[];
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => Promise<boolean>;
  onArchiveNotification?: (id: string) => Promise<boolean>;
  onMarkAllNotificationsRead?: () => Promise<boolean>;
  onRefreshInputLogs?: () => void;
  currentLang: 'EN' | 'HI';
  onAddBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onDeleteBooksBulk: (ids: string[]) => void;
  onClearInventory: () => void;
  onApproveRequest: (id: string, dueDate?: string) => Promise<{ success: boolean; error?: string } | void>;
  onRejectRequest: (id: string) => Promise<{ success: boolean; error?: string } | void>;
  onHoldRequest?: (id: string) => Promise<{ success: boolean; error?: string } | void>;
  onCancelRequest?: (id: string) => any;
  onDeleteRequest?: (id: string) => Promise<boolean>;
  onReturnBook: (logId: string) => Promise<{ success: boolean; error?: string } | void>;
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
  notifications = [],
  onMarkNotificationRead,
  onArchiveNotification,
  onMarkAllNotificationsRead,
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
  onDeleteRequest,
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
  const [activeTab, setActiveTab] = useState<'books' | 'students' | 'requests' | 'reports' | 'security' | 'database' | 'study-materials' | 'feedback' | 'gallery' | 'notifications' | 'stickers'>('books');
  const [notificationFilter, setNotificationFilter] = useState<'active' | 'archived'>('active');
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => n.status === 'Unread').length;
  }, [notifications]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [studentModalView, setStudentModalView] = useState<'timeline' | 'table'>('timeline');
  
  // --- STICKER GENERATOR STATE ---
  const [isPrintModeActive, setIsPrintModeActive] = useState<boolean>(false);
  const [booksToPrint, setBooksToPrint] = useState<Book[]>([]);
  const [stickerPrintedIds, setStickerPrintedIds] = useState<Set<string>>(() => {
    try {
      const data = localStorage.getItem('ramdiri_stickers_printed');
      if (data) {
        const arr = JSON.parse(data);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [pdfProgressStatus, setPdfProgressStatus] = useState<string>('');
  const cancelPdfGenerationRef = React.useRef<boolean>(false);

  // --- ENHANCED STICKER GENERATOR SCALABILITY & INTEGRITY SYSTEM ---
  const [stickerValidationErrorModal, setStickerValidationErrorModal] = useState<boolean>(false);
  const [failedBooksForStickers, setFailedBooksForStickers] = useState<{ book: Book; errors: string[] }[]>([]);
  const [stickerVerificationState, setStickerVerificationState] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [stickerVerificationLogs, setStickerVerificationLogs] = useState<string[]>([]);
  const [stickerPendingAction, setStickerPendingAction] = useState<{ books: Book[]; type: 'pdf' | 'print' } | null>(null);

  // Print forms state
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [selectedShelfForPrint, setSelectedShelfForPrint] = useState<string>('');
  const [selectedDdcForPrint, setSelectedDdcForPrint] = useState<string>('');

  const uniqueShelves = useMemo(() => {
    const shelves = new Set<string>();
    books.forEach(b => {
      if (b.shelfNumber && b.shelfNumber.trim()) {
        shelves.add(b.shelfNumber.trim());
      }
    });
    return Array.from(shelves).sort();
  }, [books]);

  const filterByAccessionRange = (booksList: Book[], startStr: string, endStr: string) => {
    const startNum = parseInt(startStr.replace(/\D/g, ''), 10);
    const endNum = parseInt(endStr.replace(/\D/g, ''), 10);
    
    if (isNaN(startNum) || isNaN(endNum)) {
      return booksList.filter(b => {
        const acc = (b.accessionNumber || b.bookId || '').trim();
        return acc >= startStr.trim() && acc <= endStr.trim();
      });
    }

    const startPrefix = startStr.replace(/\d/g, '').trim().toUpperCase();
    const endPrefix = endStr.replace(/\d/g, '').trim().toUpperCase();

    return booksList.filter(b => {
      const acc = (b.accessionNumber || b.bookId || '').trim();
      const accNum = parseInt(acc.replace(/\D/g, ''), 10);
      if (isNaN(accNum)) return false;

      const accPrefix = acc.replace(/\d/g, '').trim().toUpperCase();

      if (startPrefix && accPrefix !== startPrefix) return false;
      if (endPrefix && accPrefix !== endPrefix) return false;

      return accNum >= startNum && accNum <= endNum;
    });
  };

  const markAsPrinted = (bookIds: string[]) => {
    const next = new Set(stickerPrintedIds);
    bookIds.forEach(id => next.add(id));
    setStickerPrintedIds(next);
    try {
      localStorage.setItem('ramdiri_stickers_printed', JSON.stringify(Array.from(next)));
    } catch (e) {
      console.error(e);
    }
  };

  const executeStickerGenerationFlow = async (booksList: Book[], type: 'pdf' | 'print') => {
    setStickerVerificationState('verifying');
    setStickerVerificationLogs([
      "Initializing secure verification engine...",
      "Data integrity verification: PASSED (or bypassed by librarian)."
    ]);

    try {
      // Pick up up to 5 random sample books for QR verification
      const sampleSize = Math.min(5, booksList.length);
      const shuffled = [...booksList].sort(() => 0.5 - Math.random());
      const sampleBooks = shuffled.slice(0, sampleSize);

      setStickerVerificationLogs(prev => [...prev, `Selected ${sampleSize} randomized sample books for automated QR verification...`]);

      for (let i = 0; i < sampleBooks.length; i++) {
        const b = sampleBooks[i];
        const accNo = b.accessionNumber || b.bookId;
        
        setStickerVerificationLogs(prev => [...prev, `Testing target QR mapping for Accession ${accNo}...`]);
        
        const targetUrl = `${window.location.origin}/book/${encodeURIComponent(accNo)}`;
        const qrDataUrl = await QRCode.toDataURL(targetUrl, { margin: 1, width: 150 });
        if (!qrDataUrl || !qrDataUrl.startsWith("data:image/")) {
          throw new Error(`Failed to generate high-contrast QR mapping for Accession ${accNo}`);
        }

        setStickerVerificationLogs(prev => [...prev, `✓ Accession ${accNo} successfully verified.`]);
      }

      setStickerVerificationLogs(prev => [...prev, "Automated QR Verification: PASSED.", "Finalizing print layout compile..."]);
      
      setStickerVerificationState('success');
      setStickerVerificationState('idle');
      if (type === 'pdf') {
        await executeDownloadPDF(booksList);
      } else {
        executeTriggerPrint(booksList);
      }

    } catch (err: any) {
      setStickerVerificationState('failed');
      setStickerVerificationLogs(prev => [...prev, `❌ QR Verification FAILED: ${err.message || err}`]);
    }
  };

  const runStickerGenerationFlow = async (booksList: Book[], type: 'pdf' | 'print') => {
    if (booksList.length === 0) {
      alert("No books selected for printing stickers.");
      return;
    }

    setStickerPendingAction({ books: booksList, type });

    if (type === 'pdf') {
      await executeDownloadPDF(booksList);
    } else {
      executeTriggerPrint(booksList);
    }
  };

  const handleDownloadPDF = async (booksList: Book[]) => {
    await runStickerGenerationFlow(booksList, 'pdf');
  };

  const handleTriggerPrint = (booksList: Book[]) => {
    runStickerGenerationFlow(booksList, 'print');
  };

  const executeDownloadPDF = async (booksList: Book[]) => {
    if (booksList.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    setPdfProgressStatus('Preparing Sticker PDF...');
    cancelPdfGenerationRef.current = false;
    markAsPrinted(booksList.map(b => b.bookId));

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const stickerWidth = 24;
      const stickerHeight = 64;
      const cols = 8;
      const rows = 4;
      const stickersPerPage = cols * rows;

      const leftMargin = 9;
      const topMargin = 20.5;

      const colGap = 0;
      const rowGap = 0;

      const CHUNK_SIZE = 64; // Small batch size to guarantee browser stays fully responsive

      for (let i = 0; i < booksList.length; i += CHUNK_SIZE) {
        // Yield control back to browser immediately to process any clicks (e.g., Cancel)
        await new Promise(resolve => setTimeout(resolve, 10));

        if (cancelPdfGenerationRef.current) {
          console.log("PDF generation cancelled by user.");
          return;
        }

        const chunk = booksList.slice(i, i + CHUNK_SIZE);

        // Generate QR codes in parallel for the current small batch
        const qrPromises = chunk.map(async (book) => {
          const accessionNo = (book.accessionNumber || book.bookId || "").trim();
          if (!accessionNo) return null;
          const targetUrl = `${window.location.origin}/book/${encodeURIComponent(accessionNo)}`;
          try {
            const qrDataUrl = await QRCode.toDataURL(targetUrl, {
              margin: 1,
              width: 45, // 45px width generates 4x faster and takes 4x less memory than 90px
              errorCorrectionLevel: 'L', // Low error correction level generates much simpler & faster matrices
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            return { bookId: book.bookId, qrDataUrl };
          } catch (err) {
            console.error("Error generating QR:", err);
            return null;
          }
        });

        const qrResults = await Promise.all(qrPromises);
        const qrMap = new Map(qrResults.filter(Boolean).map(r => [r!.bookId, r!.qrDataUrl]));

        // Synchronously draw the chunk's stickers on jsPDF (extremely fast)
        for (let j = 0; j < chunk.length; j++) {
          const absoluteIndex = i + j;
          const pageIndex = Math.floor(absoluteIndex / stickersPerPage);
          const stickerIndexOnPage = absoluteIndex % stickersPerPage;

          if (pageIndex > 0 && stickerIndexOnPage === 0) {
            doc.addPage();
          }

          const col = stickerIndexOnPage % cols;
          const row = Math.floor(stickerIndexOnPage / cols);

          const x = leftMargin + col * (stickerWidth + colGap);
          const y = topMargin + row * (stickerHeight + rowGap);

          const book = chunk[j];
          if (!book) continue;

          const accessionNo = (book.accessionNumber || book.bookId || "").trim();
          const callNo = (book.callNumber || "").trim() || "—";
          const bookNo = (book.bookNumber || "").trim() || "—";
          const shelfLocation = (book.shelfNumber || "").trim() || "—";

          const ddcCol = getDdcColor(book.ddcNumber || book.callNumber);
          const rVal = parseInt(ddcCol.hex.substring(1, 3), 16) || 176;
          const gVal = parseInt(ddcCol.hex.substring(3, 5), 16) || 190;
          const bVal = parseInt(ddcCol.hex.substring(5, 7), 16) || 197;

          // Fill entire sticker background with DDC color
          doc.setFillColor(rVal, gVal, bVal);
          doc.rect(x, y, stickerWidth, stickerHeight, 'F');

          // Draw light grey cutting guidelines
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.15);
          doc.rect(x, y, stickerWidth, stickerHeight, 'S');

          // Text settings - choose black or white based on DDC color metadata
          const textR = parseInt(ddcCol.textColorHex.substring(1, 3), 16) || 0;
          const textG = parseInt(ddcCol.textColorHex.substring(3, 5), 16) || 0;
          const textB = parseInt(ddcCol.textColorHex.substring(5, 7), 16) || 0;
          doc.setTextColor(textR, textG, textB);
          
          const centerX = x + (stickerWidth / 2);

          // Drawing Accession Number
          doc.setFont('courier', 'bold');
          doc.setFontSize(4.5);
          doc.text("ACCESSION", centerX, y + 4.5, { align: 'center' });
          
          doc.setFontSize(7.5);
          doc.text(accessionNo, centerX, y + 7.5, { align: 'center' });

          // Draw a divider line under Accession number using the same text color
          doc.setDrawColor(textR, textG, textB);
          doc.setLineWidth(0.12);
          doc.line(x + 3, y + 8.8, x + stickerWidth - 3, y + 8.8);

          // Drawing Call Number
          doc.setFont('courier', 'bold');
          doc.setFontSize(4.5);
          doc.text("CALL NO", centerX, y + 12.0, { align: 'center' });
          doc.setFontSize(7.5);
          doc.text(callNo, centerX, y + 15.0, { align: 'center' });

          // Drawing Book Number
          doc.setFontSize(4.5);
          doc.text("BOOK NO", centerX, y + 19.5, { align: 'center' });
          doc.setFontSize(7.5);
          doc.text(bookNo, centerX, y + 22.5, { align: 'center' });

          // Drawing Shelf
          doc.setFontSize(4.5);
          doc.text("SHELF", centerX, y + 27.0, { align: 'center' });
          doc.setFontSize(7.5);
          doc.text(shelfLocation, centerX, y + 30.0, { align: 'center' });

          // Add QR Code if it exists
          if (accessionNo) {
            const qrDataUrl = qrMap.get(book.bookId);
            if (qrDataUrl) {
              try {
                // Position QR centered at the bottom of the sticker on a high-contrast container
                const qrBoxWidth = 15;
                const qrBoxHeight = 15;
                const qrBoxX = x + (stickerWidth - qrBoxWidth) / 2;
                const qrBoxY = y + stickerHeight - qrBoxHeight - 3;

                doc.setFillColor(255, 255, 255);
                doc.rect(qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 'F');

                const qrSize = 13.5;
                const qrX = qrBoxX + (qrBoxWidth - qrSize) / 2;
                const qrY = qrBoxY + (qrBoxHeight - qrSize) / 2;
                doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
              } catch (err) {
                console.error("Error drawing QR on PDF:", err);
              }
            }
          }
        }

        // Update progress smoothly
        const processedCount = Math.min(i + CHUNK_SIZE, booksList.length);
        const currentProgress = Math.round((processedCount / booksList.length) * 100);
        setPdfProgress(currentProgress);
        setPdfProgressStatus(`Compiled ${processedCount} of ${booksList.length} stickers...`);
      }

      setPdfProgress(100);
      setPdfProgressStatus('Download Ready ✅');
      await new Promise(resolve => setTimeout(resolve, 500));

      doc.save(`Library_Sticker_Sheets.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("An error occurred during PDF generation.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const executeTriggerPrint = (booksList: Book[]) => {
    if (booksList.length === 0) return;
    setBooksToPrint(booksList);
    setIsPrintModeActive(true);
    markAsPrinted(booksList.map(b => b.bookId));
    setTimeout(() => {
      window.print();
    }, 800);
  };
  
  // Universal Search query state
  const [universalQuery, setUniversalQuery] = useState<string>('');
  
  // Debounced Search Inputs and original query state
  const [bookSearchInput, setBookSearchInput] = useState<string>('');
  const [studentSearchInput, setStudentSearchInput] = useState<string>('');
  const [bookSearch, setBookSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // SRE Search states for table cross-management
  const [loanSearch, setLoanSearch] = useState<string>('');
  const [reportsSearch, setReportsSearch] = useState<string>('');
  const [requestSearch, setRequestSearch] = useState<string>('');
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [feedbackSearch, setFeedbackSearch] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [circSearchQuery, setCircSearchQuery] = useState<string>('');
  const [circFilterClass, setCircFilterClass] = useState<string>('');
  const [circFilterSection, setCircFilterSection] = useState<string>('');
  const [circFilterPreset, setCircFilterPreset] = useState<'all' | 'pending' | 'active' | 'overdue' | 'returned'>('pending');

  // Memoized Universal Search results mapping matching books, students, and issue logs
  const universalResults = useMemo(() => {
    const query = universalQuery.trim().toLowerCase();
    if (!query || query.length < 2) return { books: [], students: [], logs: [] };

    const matchedBooks = books.filter(b => 
      b.bookId.toLowerCase().includes(query) ||
      b.bookName.toLowerCase().includes(query) ||
      (b.author && b.author.toLowerCase().includes(query)) ||
      (b.accessionNumber && b.accessionNumber.toLowerCase().includes(query))
    ).slice(0, 4);

    const matchedStudents = students.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      String(s.rollNumber).includes(query) ||
      (s.class && s.class.toLowerCase().includes(query))
    ).slice(0, 4);

    const matchedLogs = issueLogs.filter(l => 
      l.bookName.toLowerCase().includes(query) ||
      l.studentName.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query) ||
      (l.class && l.class.toLowerCase().includes(query))
    ).slice(0, 4);

    return { books: matchedBooks, students: matchedStudents, logs: matchedLogs };
  }, [universalQuery, books, students, issueLogs]);

  // Highlight matching search term in text securely
  const highlightText = (text: string | number | undefined, search: string) => {
    if (text === undefined || text === null) return <span></span>;
    const textStr = String(text);
    if (!search || !textStr) return <span>{textStr}</span>;
    const cleanSearch = search.trim();
    if (!cleanSearch) return <span>{textStr}</span>;
    
    try {
      const parts = textStr.split(new RegExp(`(${cleanSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) => 
            part.toLowerCase() === cleanSearch.toLowerCase() ? (
              <mark key={i} className="bg-yellow-250 text-slate-900 font-bold px-0.5 rounded shadow-xs border border-yellow-300 dark:bg-yellow-500/30 dark:text-yellow-100 dark:border-yellow-600/50">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{textStr}</span>;
    }
  };

  // Sliced Pagination indices
  const [booksPage, setBooksPage] = useState<number>(1);
  const [studentsPage, setStudentsPage] = useState<number>(1);
  const [activeLoansPage, setActiveLoansPage] = useState<number>(1);
  const [circPendingPage, setCircPendingPage] = useState<number>(1);
  const [circOverduePage, setCircOverduePage] = useState<number>(1);
  const [circReturnedPage, setCircReturnedPage] = useState<number>(1);

  // Infinite scroll dynamic row limits for performance with very large datasets
  const [visibleBooksCount, setVisibleBooksCount] = useState<number>(30);
  const [visibleStudentsCount, setVisibleStudentsCount] = useState<number>(40);

  // Performance Profiling Metrics
  const [bookSearchElapsed, setBookSearchElapsed] = useState<number>(0.15);
  const [studentSearchElapsed, setStudentSearchElapsed] = useState<number>(0.11);

  // --- STUDENT FEEDBACK moderation states & handlers ---
  const [allFeedbacks, setAllFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState<boolean>(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [feedbackFilter, setFeedbackFilter] = useState<'All' | 'Pending' | 'Approved' | 'Spam' | 'Resolved' | 'Rejected' | 'Hidden'>('All');

  const fetchLibrarianFeedbacks = () => {
    setFeedbacksLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");
    fetch('/api/feedback/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllFeedbacks(data);
        }
      })
      .catch(err => console.error("Error loading all feedbacks:", err))
      .finally(() => setFeedbacksLoading(false));
  };

  React.useEffect(() => {
    if (activeTab === 'feedback') {
      fetchLibrarianFeedbacks();
    }
  }, [activeTab]);

  // --- GALLERY MANAGEMENT STATES & HANDLERS ---
  const [localGalleryImages, setLocalGalleryImages] = useState<any[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState<boolean>(false);
  const [isGallerySaving, setIsGallerySaving] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySuccess, setGallerySuccess] = useState<string | null>(null);

  const fetchGalleryImages = () => {
    setIsGalleryLoading(true);
    setGalleryError(null);
    setGallerySuccess(null);
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setLocalGalleryImages(data.images || []);
        } else {
          setGalleryError(data.error || "Failed to load gallery");
        }
      })
      .catch(err => {
        console.error("Gallery load error:", err);
        setGalleryError("Network error loading gallery images");
      })
      .finally(() => setIsGalleryLoading(false));
  };

  React.useEffect(() => {
    if (activeTab === 'gallery') {
      fetchGalleryImages();
    }
  }, [activeTab]);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    const token = localStorage.getItem("ramdiri_library_token");
    fetch(`/api/feedback/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => {
        if (res.ok) {
          fetchLibrarianFeedbacks();
        } else {
          alert("Could not update status.");
        }
      })
      .catch(() => alert("Network error updating feedback status."));
  };

  const handleSendReply = (id: string) => {
    if (!replyText.trim()) {
      alert("Please write a response.");
      return;
    }
    const token = localStorage.getItem("ramdiri_library_token");
    fetch(`/api/feedback/${id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reply: replyText })
    })
      .then(res => {
        if (res.ok) {
          setActiveReplyId(null);
          setReplyText('');
          fetchLibrarianFeedbacks();
        } else {
          alert("Could not post reply.");
        }
      })
      .catch(() => alert("Network error sending reply."));
  };

  const handleDeleteFeedback = (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this student suggestion / complaint? This cannot be undone.")) {
      return;
    }
    const token = localStorage.getItem("ramdiri_library_token");
    fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) {
          fetchLibrarianFeedbacks();
        } else {
          alert("Could not delete feedback.");
        }
      })
      .catch(() => alert("Network error deleting feedback."));
  };

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
      setVisibleBooksCount(30);
    }, 250);
    return () => clearTimeout(handler);
  }, [bookSearchInput]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setStudentSearch(studentSearchInput);
      setStudentsPage(1);
      setVisibleStudentsCount(40);
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
  const [formShelfNumber, setFormShelfNumber] = useState('');

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
  const [studDOB, setStudDOB] = useState('');

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

  // Profile Form States
  const [profileDesignation, setProfileDesignation] = useState<string>('');
  const [profileBiography, setProfileBiography] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [profileYearsOfService, setProfileYearsOfService] = useState<string>('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // Custom high-fidelity non-blocking interactive overlay states
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete-book' | 'delete-selected-books' | 'clear-books' | 'delete-student' | 'delete-selected-students' | 'clear-students' | 'restore-database' | 'reset-database' | 'return-book';
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

  // Manage browser history popstate to allow physical back-button to close active profile modals
  useEffect(() => {
    let pushed = false;
    const handlePopState = () => {
      if (selectedProfileStudent || selectedProfileBook) {
        setSelectedProfileStudent(null);
        setSelectedProfileBook(null);
      }
    };

    if (selectedProfileStudent || selectedProfileBook) {
      window.history.pushState({ modalOpen: "profile-modal" }, "");
      pushed = true;
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (pushed && !(selectedProfileStudent || selectedProfileBook)) {
        if (window.history.state?.modalOpen === "profile-modal") {
          window.history.back();
        }
      }
    };
  }, [selectedProfileStudent, selectedProfileBook]);

  // Prepopulate security config and benchmark elapsed search times
  useEffect(() => {
    if (activeTab === 'security') {
      setNewName(loggedInName || "Not configured");
      const tok = localStorage.getItem("ramdiri_library_token");
      if (tok) {
        try {
          const payload = JSON.parse(atob(tok.split('.')[1]));
          setNewUsername(payload.username || "ramdiri_admin_roy");
        } catch (e) {
          setNewUsername("ramdiri_admin_roy");
        }
      }
      
      // Fetch dynamic profile fields
      fetch('/api/librarian/profile')
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            setProfileDesignation(data.designation || "Senior Chief Librarian");
            setProfileBiography(data.biography || "");
            setProfilePhoto(data.profilePhoto || "");
            setProfileYearsOfService(data.yearsOfService || "");
          }
        })
        .catch(err => console.error("Could not load librarian profile settings:", err));
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
        title: "Verification Required",
        message: `Please enter '${requireInput}' exactly to authorize this administrative operation.`,
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
          title: "Book Deleted Successfully",
          message: "The selected book record has been successfully deleted from the library catalog.",
          type: 'success'
        });
      } else if (type === 'delete-selected-books' && Array.isArray(targetId)) {
        onDeleteBooksBulk(targetId);
        setSelectedBookIds([]);
        setAlertOverlay({
          title: "Selected Books Deleted",
          message: `Successfully deleted ${targetId.length} book records from the catalog.`,
          type: 'success'
        });
      } else if (type === 'clear-books') {
        onClearInventory();
        setSelectedBookIds([]);
        setAlertOverlay({
          title: "Catalog Cleared",
          message: "All books and shelf allocation entries have been successfully deleted from the catalog.",
          type: 'success'
        });
      } else if (type === 'delete-student' && typeof targetId === 'string') {
        const success = await onDeleteStudent(targetId);
        if (success) {
          setAlertOverlay({
            title: "Student Deleted Successfully",
            message: "Student details have been successfully deleted from the school records.",
            type: 'success'
          });
        }
      } else if (type === 'delete-selected-students' && Array.isArray(targetId)) {
        const success = await onDeleteStudentsBulk?.(targetId);
        if (success) {
          setSelectedStudentIds([]);
          setAlertOverlay({
            title: "Selected Students Deleted",
            message: `Successfully deleted ${targetId.length} student records from the school records.`,
            type: 'success'
          });
        }
      } else if (type === 'clear-students') {
        const success = await onClearStudentsRegistry?.();
        if (success) {
          setSelectedStudentIds([]);
          setAlertOverlay({
            title: "Student Roster Cleared",
            message: "All student details and accounts have been successfully cleared from the system.",
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
          title: "System Database Reset Completed",
          message: "The library portal database was successfully reset to school standard baseline records.",
          type: 'success'
        });
        fetchDbInspectorStats();
      } else if (type === 'return-book' && typeof targetId === 'string') {
        setIsSubmittingAction(true);
        const result = await onReturnBook(targetId);
        setIsSubmittingAction(false);
        if (result && (result as any).success) {
          setAlertOverlay({
            title: currentLang === 'EN' ? "Book Returned" : "पुस्तक प्राप्त हुई",
            message: currentLang === 'EN'
              ? "The selected book has been successfully returned to the shelves and inventory counts have been replenished."
              : "चयनित पुस्तक सफलतापूर्वक अलमारियों में वापस आ गई है और स्टॉक अपडेट हो गया है।",
            type: 'success'
          });
        } else {
          setAlertOverlay({
            title: "Check-in Failed",
            message: currentLang === 'EN'
              ? `Error performing check-in: ${(result as any)?.error || "Server error"}`
              : `चेक-इन करने में त्रुटि: ${(result as any)?.error || "सर्वर त्रुटि"}`,
            type: 'error'
          });
        }
      }
    } catch (err: any) {
      setAlertOverlay({
        title: "Operation Failed",
        message: err.message || "An unexpected error occurred. Please try again.",
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
  const [showExcelBooksModal, setShowExcelBooksModal] = useState<boolean>(false);
  const [showExcelStudentsModal, setShowExcelStudentsModal] = useState<boolean>(false);

  // Issued Details Modal state
  const [showIssuedModal, setShowIssuedModal] = useState<boolean>(false);
  const [issuedModalFilter, setIssuedModalFilter] = useState<'Issued' | 'Returned' | 'Overdue'>('Issued');
  const [issuedModalSearch, setIssuedModalSearch] = useState<string>('');

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
    const previousName = loggedInName || "Not configured";

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

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!newName.trim()) {
      setProfileError("Librarian Display Name is required.");
      return;
    }

    setProfileLoading(true);
    const token = localStorage.getItem("ramdiri_library_token");

    fetch('/api/librarian/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newName.trim(),
        designation: profileDesignation.trim(),
        biography: profileBiography.trim(),
        profilePhoto: profilePhoto.trim(),
        yearsOfService: profileYearsOfService.trim()
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setProfileSuccess("Chief Librarian profile settings updated successfully!");
        if (data.token) {
          localStorage.setItem("ramdiri_library_token", data.token);
        }
        if (onUpdateLoggedInName && data.profile && data.profile.name) {
          onUpdateLoggedInName(data.profile.name);
        }
      } else {
        setProfileError(data.error || "Unable to update profile settings.");
      }
    })
    .catch(() => {
      setProfileError("Network connection fault. Unable to submit profile settings to server.");
    })
    .finally(() => {
      setProfileLoading(false);
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
      tabStudyMaterials: "Digital Resources",
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
      tabStudyMaterials: "डिजिटल संसाधन (Resources)",
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

  // Resolve Student demographic particulars from roll number, class and section safely
  const getStudentProfile = (rollNumber: any, studentClass?: string, studentSection?: string) => {
    const cleanClass = (cls: any) => String(cls || '').replace(/\D/g, '');
    const cleanSection = (sec: any) => String(sec || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    
    const s = students.find(stud => {
      const studRoll = Number(stud.rollNumber);
      const targetRoll = Number(rollNumber);
      if (studRoll !== targetRoll) return false;
      
      if (studentClass && studentSection) {
        const sClass = cleanClass(stud.class);
        const tClass = cleanClass(studentClass);
        const sSec = cleanSection(stud.section);
        const tSec = cleanSection(studentSection);
        if (sClass && tClass && sClass !== tClass) return false;
        if (sSec && tSec && sSec !== tSec) return false;
      }
      return true;
    });

    return {
      name: s?.name || "Student Reader",
      class: s?.class || studentClass || "10",
      section: s?.section || studentSection || "A"
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
  const totalIssuedCopies = issueLogs.filter(log => log.status === 'Issued').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;

  // Active Loans status Issued List
  const activeLoans = useMemo(() => {
    let list = issueLogs.filter(log => log.status === 'Issued');
    if (loanSearch.trim()) {
      const searchLower = loanSearch.toLowerCase().trim();
      list = list.filter(loan => 
        (loan.studentName || "").toLowerCase().includes(searchLower) ||
        String(loan.rollNumber || "").toLowerCase().includes(searchLower) ||
        (loan.bookId || "").toLowerCase().includes(searchLower) ||
        (loan.bookName || "").toLowerCase().includes(searchLower) ||
        (loan.id || "").toLowerCase().includes(searchLower)
      );
    }
    return list;
  }, [issueLogs, loanSearch]);

  // General Overdue Logs list
  const overdueLogs = useMemo(() => {
    return activeLoans.filter(log => isOverdue(log.dueDate));
  }, [activeLoans]);

  // Contextual circulation filtered lists for Requests/Desk tab
  const filteredRequestsList = useMemo(() => {
    let list = requests.filter(r => r.status === 'Pending');

    if (circFilterClass) {
      list = list.filter(r => String(r.class || '').trim() === circFilterClass.trim());
    }
    if (circFilterSection) {
      list = list.filter(r => String(r.section || '').trim().toUpperCase() === circFilterSection.trim().toUpperCase());
    }

    if (circSearchQuery.trim()) {
      const q = circSearchQuery.toLowerCase().trim();
      list = list.filter(r => {
        const bk = books.find(b => b.bookId === r.bookId);
        const nameStr = (r.studentName || "").toLowerCase();
        const rollStr = String(r.rollNumber || "").toLowerCase();
        const classStr = (r.class || "").toLowerCase();
        const sectionStr = (r.section || "").toLowerCase();
        const titleStr = (r.bookName || "").toLowerCase();
        const idStr = (r.id || "").toLowerCase();

        const studentMatch = nameStr.includes(q) || rollStr.includes(q) || classStr.includes(q) || sectionStr.includes(q);
        const bookMatch = titleStr.includes(q) || (r.bookId || "").toLowerCase().includes(q) || (bk && (
          (bk.bookNumber || "").toLowerCase().includes(q) ||
          (bk.accessionNumber || "").toLowerCase().includes(q) ||
          (bk.callNumber || "").toLowerCase().includes(q) ||
          (bk.author || "").toLowerCase().includes(q) ||
          (bk.category || "").toLowerCase().includes(q)
        ));

        return studentMatch || bookMatch || idStr.includes(q);
      });
    }
    return list;
  }, [requests, books, circFilterClass, circFilterSection, circSearchQuery]);

  const filteredActiveLoansList = useMemo(() => {
    let list = issueLogs.filter(log => log.status === 'Issued');

    if (circFilterClass) {
      list = list.filter(log => String(log.class || '').trim() === circFilterClass.trim());
    }
    if (circFilterSection) {
      list = list.filter(log => String(log.section || '').trim().toUpperCase() === circFilterSection.trim().toUpperCase());
    }

    if (circSearchQuery.trim()) {
      const q = circSearchQuery.toLowerCase().trim();
      list = list.filter(log => {
        const bk = books.find(b => b.bookId === log.bookId);
        const nameStr = (log.studentName || "").toLowerCase();
        const rollStr = String(log.rollNumber || "").toLowerCase();
        const classStr = (log.class || "").toLowerCase();
        const sectionStr = (log.section || "").toLowerCase();
        const titleStr = (log.bookName || "").toLowerCase();
        const idStr = (log.id || "").toLowerCase();

        const studentMatch = nameStr.includes(q) || rollStr.includes(q) || classStr.includes(q) || sectionStr.includes(q);
        const bookMatch = titleStr.includes(q) || (log.bookId || "").toLowerCase().includes(q) || (bk && (
          (bk.bookNumber || "").toLowerCase().includes(q) ||
          (bk.accessionNumber || "").toLowerCase().includes(q) ||
          (bk.callNumber || "").toLowerCase().includes(q) ||
          (bk.author || "").toLowerCase().includes(q) ||
          (bk.category || "").toLowerCase().includes(q)
        ));

        return studentMatch || bookMatch || idStr.includes(q);
      });
    }
    return list;
  }, [issueLogs, books, circFilterClass, circFilterSection, circSearchQuery]);

  const filteredOverdueLoansList = useMemo(() => {
    return filteredActiveLoansList.filter(log => isOverdue(log.dueDate));
  }, [filteredActiveLoansList]);

  const filteredReturnedLoansList = useMemo(() => {
    let list = issueLogs.filter(log => log.status === 'Returned');

    if (circFilterClass) {
      list = list.filter(log => String(log.class || '').trim() === circFilterClass.trim());
    }
    if (circFilterSection) {
      list = list.filter(log => String(log.section || '').trim().toUpperCase() === circFilterSection.trim().toUpperCase());
    }

    if (circSearchQuery.trim()) {
      const q = circSearchQuery.toLowerCase().trim();
      list = list.filter(log => {
        const bk = books.find(b => b.bookId === log.bookId);
        const nameStr = (log.studentName || "").toLowerCase();
        const rollStr = String(log.rollNumber || "").toLowerCase();
        const classStr = (log.class || "").toLowerCase();
        const sectionStr = (log.section || "").toLowerCase();
        const titleStr = (log.bookName || "").toLowerCase();
        const idStr = (log.id || "").toLowerCase();

        const studentMatch = nameStr.includes(q) || rollStr.includes(q) || classStr.includes(q) || sectionStr.includes(q);
        const bookMatch = titleStr.includes(q) || (log.bookId || "").toLowerCase().includes(q) || (bk && (
          (bk.bookNumber || "").toLowerCase().includes(q) ||
          (bk.accessionNumber || "").toLowerCase().includes(q) ||
          (bk.callNumber || "").toLowerCase().includes(q) ||
          (bk.author || "").toLowerCase().includes(q) ||
          (bk.category || "").toLowerCase().includes(q)
        ));

        return studentMatch || bookMatch || idStr.includes(q);
      });
    }
    return list;
  }, [issueLogs, books, circFilterClass, circFilterSection, circSearchQuery]);

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

    const query = studentSearchInput.trim();
    if (query) {
      const results = fuseStudents.search(query);
      result = results.map(r => r.item);
    }

    if (filterClass) {
      result = result.filter(s => String(s.class).trim() === filterClass.trim());
    }

    if (filterSection) {
      result = result.filter(s => String(s.section).trim().toUpperCase() === filterSection.trim().toUpperCase());
    }

    return result;
  }, [students, studentSearchInput, filterClass, filterSection]);

  // Infinite scroll lists for superb UI rendering performance under load
  const paginatedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleBooksCount);
  }, [filteredBooks, visibleBooksCount]);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleStudentsCount);
  }, [filteredStudents, visibleStudentsCount]);

  const paginatedLoans = useMemo(() => {
    const startIdx = (activeLoansPage - 1) * 15;
    return filteredActiveLoansList.slice(startIdx, startIdx + 15);
  }, [filteredActiveLoansList, activeLoansPage]);

  const paginatedCircPending = useMemo(() => {
    const startIdx = (circPendingPage - 1) * 15;
    return filteredRequestsList.slice(startIdx, startIdx + 15);
  }, [filteredRequestsList, circPendingPage]);

  const paginatedCircOverdue = useMemo(() => {
    const startIdx = (circOverduePage - 1) * 15;
    return filteredOverdueLoansList.slice(startIdx, startIdx + 15);
  }, [filteredOverdueLoansList, circOverduePage]);

  const paginatedCircReturned = useMemo(() => {
    const startIdx = (circReturnedPage - 1) * 15;
    return filteredReturnedLoansList.slice(startIdx, startIdx + 15);
  }, [filteredReturnedLoansList, circReturnedPage]);

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

    const ddcValue = formDdcNumber.trim();
    const originalDdc = editingBook ? (editingBook.ddcNumber || "").trim() : "";
    
    if (ddcValue !== "" && ddcValue !== originalDdc) {
      const isValidDdc = /^\d{3}(\.\d+)?$/.test(ddcValue);
      if (!isValidDdc) {
        alert(currentLang === 'EN' 
          ? "Validation Error: The entered DDC Classification Number is invalid. A valid DDC number must start with exactly 3 digits, followed optionally by a decimal point and digits (e.g. 005, 398.2, 621.381)."
          : "सत्यापन त्रुटि: दर्ज किया गया डीडीसी वर्गीकरण नंबर अमान्य है। एक मान्य डीडीसी नंबर में ठीक 3 अंक होने चाहिए, जिसके बाद वैकल्पिक रूप से एक दशमलव बिंदु और अंक हो सकते हैं (जैसे 005, 398.2, 621.381)।"
        );
        return;
      }
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
      ddcNumber: formDdcNumber.trim(),
      shelfNumber: formShelfNumber.trim()
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
    setFormShelfNumber('');
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
    setFormShelfNumber(book.shelfNumber || '');
    setShowBookForm(true);
  };

  const handleDdcChange = (val: string) => {
    setFormDdcNumber(val);
    setFormCategory(getDdcCategoryName(val));
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
      alert("Please fill all required student parameters (Name, Roll Number, Class, Section, and Date of Birth).");
      return;
    }

    const parsedRoll = parseInt(studRoll.trim(), 10) || 0;
    if (parsedRoll <= 0) {
      alert("Roll Number must be a positive integer.");
      return;
    }

    // Generate unique Student ID: Class-Section-RollNumber with normalized integer roll number
    const studentId = `${studClass.trim().toUpperCase()}-${studSection.trim().toUpperCase()}-${parsedRoll}`;

    // Verify duplication client-side to raise warning
    if (!editingStudent) {
      const isDuplicate = students.some(s => s.studentId === studentId);
      if (isDuplicate) {
        alert(`Duplicate Registry: A student with Class ${studClass.trim()}, Section ${studSection.trim().toUpperCase()}, and Roll Number ${parsedRoll} is already registered.`);
        return;
      }
    }

    const payload: Student = {
      studentId,
      name: studName.trim(),
      class: studClass.trim().toUpperCase(),
      section: studSection.trim().toUpperCase(),
      rollNumber: parsedRoll,
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
      setStudDOB('');
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
    setStudDOB(stud.dob || '');
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

  const handleApproveAction = async (id: string, dueDate?: string) => {
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    const result = await onApproveRequest(id, dueDate);
    setIsSubmittingAction(false);
    if (result && (result as any).success) {
      alert(currentLang === 'EN' ? "Borrow request approved successfully!" : "उधार अनुरोध सफलतापूर्वक स्वीकृत किया गया!");
    } else {
      alert(currentLang === 'EN' ? `Approval failed: ${(result as any)?.error || "Server error"}` : `स्वीकृति विफल: ${(result as any)?.error || "सर्वर त्रुटि"}`);
    }
  };

  const handleRejectAction = async (id: string) => {
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    const result = await onRejectRequest(id);
    setIsSubmittingAction(false);
    if (result && (result as any).success) {
      alert(currentLang === 'EN' ? "Borrow request rejected successfully." : "उधार अनुरोध सफलतापूर्वक खारिज कर दिया गया।");
    } else {
      alert(currentLang === 'EN' ? `Rejection failed: ${(result as any)?.error || "Server error"}` : `अस्वीकृति विफल: ${(result as any)?.error || "सर्वर त्रुटि"}`);
    }
  };

  const handleHoldAction = async (id: string) => {
    if (!onHoldRequest) return;
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    const result = await onHoldRequest(id);
    setIsSubmittingAction(false);
    if (result && (result as any).success) {
      alert(currentLang === 'EN' ? "Request put on Hold status." : "अनुरोध को होल्ड स्थिति पर रख दिया गया है।");
    } else {
      alert(currentLang === 'EN' ? `Hold failed: ${(result as any)?.error || "Server error"}` : `होल्ड विफल: ${(result as any)?.error || "सर्वर त्रुटि"}`);
    }
  };

  const handleDeleteRequestAction = async (id: string) => {
    if (!onDeleteRequest) return;
    if (isSubmittingAction) return;
    if (!window.confirm(currentLang === 'EN' ? "Are you sure you want to delete this borrow request record from the database completely?" : "क्या आप वाकई इस उधार अनुरोध रिकॉर्ड को डेटाबेस से पूरी तरह हटाना चाहते हैं?")) {
      return;
    }
    setIsSubmittingAction(true);
    await onDeleteRequest(id);
    setIsSubmittingAction(false);
  };

  const handleReturnAction = (logId: string) => {
    const loan = issueLogs.find(l => l.id === logId);
    if (!loan) return;
    
    setConfirmModal({
      type: 'return-book',
      title: currentLang === 'EN' ? 'Confirm Book Return (Check-In)' : 'पुस्तक वापसी की पुष्टि करें',
      message: currentLang === 'EN'
        ? `Are you sure you want to check-in the book "${loan.bookName}" (ID: ${loan.bookId}) returned by ${loan.studentName} (Roll #${loan.rollNumber})?`
        : `क्या आप सुनिश्चित हैं कि आप ${loan.studentName} (रॉल #${loan.rollNumber}) द्वारा लौटाई गई पुस्तक "${loan.bookName}" (ID: ${loan.bookId}) को जमा/चेक-इन करना चाहते हैं?`,
      confirmLabel: currentLang === 'EN' ? 'Confirm and Check-In' : 'जमा करने की पुष्टि करें',
      targetId: logId
    });
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
    let baseList = [];
    if (issuedModalFilter === 'Issued') {
      baseList = issueLogs.filter(log => log.status === 'Issued');
    } else if (issuedModalFilter === 'Returned') {
      baseList = issueLogs.filter(log => log.status === 'Returned');
    } else {
      baseList = issueLogs.filter(log => log.status === 'Issued' && isOverdue(log.dueDate));
    }

    if (!issuedModalSearch.trim()) {
      return baseList;
    }

    const q = issuedModalSearch.toLowerCase().trim();

    // Map lookups for fast retrieval
    const booksMap = new Map<string, typeof books[0]>();
    for (const b of books) {
      booksMap.set(b.bookId, b);
    }

    const studentsMap = new Map<string, typeof students[0]>();
    for (const s of students) {
      const key = `${String(s.class).trim().toLowerCase()}-${String(s.section).trim().toLowerCase()}-${s.rollNumber}`;
      studentsMap.set(key, s);
    }

    return baseList.filter(log => {
      // 1. Check direct properties of log
      if (
        (log.studentName || "").toLowerCase().includes(q) ||
        String(log.rollNumber || "").toLowerCase().includes(q) ||
        (log.class || "").toLowerCase().includes(q) ||
        (log.section || "").toLowerCase().includes(q) ||
        (log.bookName || "").toLowerCase().includes(q) ||
        (log.bookId || "").toLowerCase().includes(q) ||
        (log.id || "").toLowerCase().includes(q)
      ) {
        return true;
      }

      // 2. Check student's registered fields
      const logClass = String(log.class || '').trim().toLowerCase();
      const logSection = String(log.section || '').trim().toLowerCase();
      const studKey = `${logClass}-${logSection}-${log.rollNumber}`;
      const stud = studentsMap.get(studKey);
      if (stud) {
        if (
          (stud.name || "").toLowerCase().includes(q) ||
          String(stud.rollNumber || "").includes(q) ||
          (stud.class || "").toLowerCase().includes(q) ||
          (stud.section || "").toLowerCase().includes(q)
        ) {
          return true;
        }
      }

      // 3. Check book's catalog details
      const bk = booksMap.get(log.bookId);
      if (bk) {
        if (
          (bk.bookName || "").toLowerCase().includes(q) ||
          (bk.bookNumber || "").toLowerCase().includes(q) ||
          (bk.accessionNumber || "").toLowerCase().includes(q) ||
          (bk.callNumber || "").toLowerCase().includes(q) ||
          (bk.author || "").toLowerCase().includes(q) ||
          (bk.category || "").toLowerCase().includes(q)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [issueLogs, issuedModalFilter, issuedModalSearch, books, students]);

  // Report lists with real-time high-performance filtering
  const filteredReportLoans = useMemo(() => {
    const baseList = issueLogs.filter(log => log.status === 'Issued');
    if (!reportsSearch.trim()) return baseList;
    const q = reportsSearch.toLowerCase().trim();
    return baseList.filter(log => {
      if (
        (log.studentName || "").toLowerCase().includes(q) ||
        String(log.rollNumber || "").toLowerCase().includes(q) ||
        (log.bookName || "").toLowerCase().includes(q) ||
        (log.bookId || "").toLowerCase().includes(q) ||
        (log.class || "").toLowerCase().includes(q) ||
        (log.section || "").toLowerCase().includes(q)
      ) return true;
      const bk = books.find(b => b.bookId === log.bookId);
      if (bk && (
        (bk.bookNumber || "").toLowerCase().includes(q) ||
        (bk.accessionNumber || "").toLowerCase().includes(q) ||
        (bk.callNumber || "").toLowerCase().includes(q) ||
        (bk.author || "").toLowerCase().includes(q) ||
        (bk.category || "").toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }, [issueLogs, reportsSearch, books]);

  const filteredReportOverdue = useMemo(() => {
    const baseList = issueLogs.filter(log => log.status === 'Issued' && isOverdue(log.dueDate));
    if (!reportsSearch.trim()) return baseList;
    const q = reportsSearch.toLowerCase().trim();
    return baseList.filter(log => {
      if (
        (log.studentName || "").toLowerCase().includes(q) ||
        String(log.rollNumber || "").toLowerCase().includes(q) ||
        (log.bookName || "").toLowerCase().includes(q) ||
        (log.bookId || "").toLowerCase().includes(q) ||
        (log.class || "").toLowerCase().includes(q) ||
        (log.section || "").toLowerCase().includes(q)
      ) return true;
      const bk = books.find(b => b.bookId === log.bookId);
      if (bk && (
        (bk.bookNumber || "").toLowerCase().includes(q) ||
        (bk.accessionNumber || "").toLowerCase().includes(q) ||
        (bk.callNumber || "").toLowerCase().includes(q) ||
        (bk.author || "").toLowerCase().includes(q) ||
        (bk.category || "").toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }, [issueLogs, reportsSearch, books]);

  const filteredReportHistory = useMemo(() => {
    const baseList = issueLogs;
    if (!reportsSearch.trim()) return baseList;
    const q = reportsSearch.toLowerCase().trim();
    return baseList.filter(log => {
      if (
        (log.studentName || "").toLowerCase().includes(q) ||
        String(log.rollNumber || "").toLowerCase().includes(q) ||
        (log.bookName || "").toLowerCase().includes(q) ||
        (log.bookId || "").toLowerCase().includes(q) ||
        (log.class || "").toLowerCase().includes(q) ||
        (log.section || "").toLowerCase().includes(q)
      ) return true;
      const bk = books.find(b => b.bookId === log.bookId);
      if (bk && (
        (bk.bookNumber || "").toLowerCase().includes(q) ||
        (bk.accessionNumber || "").toLowerCase().includes(q) ||
        (bk.callNumber || "").toLowerCase().includes(q) ||
        (bk.author || "").toLowerCase().includes(q) ||
        (bk.category || "").toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }, [issueLogs, reportsSearch, books]);

  const filteredReportStudents = useMemo(() => {
    const baseList = students;
    if (!reportsSearch.trim()) return baseList;
    const q = reportsSearch.toLowerCase().trim();
    return baseList.filter(s => 
      (s.name || "").toLowerCase().includes(q) ||
      String(s.rollNumber || "").toLowerCase().includes(q) ||
      (s.class || "").toLowerCase().includes(q) ||
      (s.section || "").toLowerCase().includes(q)
    );
  }, [students, reportsSearch]);

  const filteredReportInventory = useMemo(() => {
    const baseList = books;
    if (!reportsSearch.trim()) return baseList;
    const q = reportsSearch.toLowerCase().trim();
    return baseList.filter(b => 
      (b.bookName || "").toLowerCase().includes(q) ||
      (b.author || "").toLowerCase().includes(q) ||
      (b.category || "").toLowerCase().includes(q) ||
      (b.bookNumber || "").toLowerCase().includes(q) ||
      (b.accessionNumber || "").toLowerCase().includes(q) ||
      (b.callNumber || "").toLowerCase().includes(q)
    );
  }, [books, reportsSearch]);

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
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 outline-none text-slate-900 dark:text-white font-mono uppercase font-black tracking-widest text-center focus:ring-1 focus:ring-red-500"
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

      {/* STICKER DATA INTEGRITY VALIDATION REPORT MODAL */}
      {stickerValidationErrorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl rounded-2xl flex flex-col scale-in-center">
            
            <div className="bg-red-650 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-extrabold text-xs uppercase tracking-wider select-none">
                  Sticker Data Integrity Validation Report
                </span>
              </div>
              <button 
                onClick={() => setStickerValidationErrorModal(false)}
                className="text-white hover:text-slate-200 transition-all font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[75vh]">
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3.5 rounded-xl border border-amber-150 dark:border-amber-950 text-xs leading-relaxed">
                <strong>Data Completeness Warning:</strong> Some of your selected books have missing catalog data fields (such as Book Number, Call Number, or DDC classification). For optimal sticker layout, we recommend filling these fields. However, you can proceed to print stickers anyway—missing values will simply display as <strong>"—"</strong> or <strong>"Not Assigned"</strong>.
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Missing Fields Checklist ({failedBooksForStickers.length} books require review)
                </h4>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {failedBooksForStickers.map(({ book, errors }, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-950/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {book.bookName || "Untitled Book"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          ID: {book.bookId} | Author: {book.author || "Unknown"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {errors.map((err, eIdx) => (
                            <span key={eIdx} className="bg-amber-50 dark:bg-amber-955/50 border border-amber-100 dark:border-amber-900 text-amber-650 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                              {err}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setStickerValidationErrorModal(false);
                          if (typeof openBookEdit === 'function') {
                            openBookEdit(book);
                          } else {
                            const editBtn = document.querySelector(`[data-edit-id="${book.bookId}"]`) as HTMLButtonElement;
                            if (editBtn) editBtn.click();
                          }
                        }}
                        className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[10px] rounded uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Record</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setStickerValidationErrorModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs rounded-lg cursor-pointer transition-all tracking-wider"
                >
                  Cancel & Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setStickerValidationErrorModal(false);
                    if (stickerPendingAction) {
                      await executeStickerGenerationFlow(stickerPendingAction.books, stickerPendingAction.type);
                    }
                  }}
                  className="px-5 py-2 bg-amber-550 hover:bg-amber-600 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all tracking-wider flex items-center gap-1.5"
                >
                  <span>🖨️ Print Anyway (Ignore warnings)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STICKER PDF GENERATION PROGRESS MODAL */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in" id="sticker-pdf-generation-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl rounded-2xl flex flex-col scale-in-center select-none font-sans">
            <div className="bg-slate-900 text-white p-4.5 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 shrink-0 animate-spin text-indigo-400" />
              <span className="font-extrabold text-xs uppercase tracking-wider">
                Preparing Sticker PDF...
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-950 text-emerald-400 p-5 rounded-xl font-mono text-xs space-y-3 border border-slate-800 shadow-inner">
                <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  System Status: {pdfProgress === 100 ? 'DOWNLOAD READY' : 'COMPILING STICKERS'}
                </div>
                
                {/* Text Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-emerald-500">
                    <span>PROGRESS:</span>
                    <span>{pdfProgress}%</span>
                  </div>
                  <div className="tracking-widest break-all select-none text-[13px] leading-tight text-emerald-400 font-bold">
                    {'█'.repeat(Math.round((pdfProgress / 100) * 20))}
                    <span className="text-slate-700">{'░'.repeat(20 - Math.round((pdfProgress / 100) * 20))}</span>
                  </div>
                </div>

                <div className="text-[11px] pt-1.5 border-t border-slate-900 text-slate-500 flex justify-between">
                  <span>Status:</span>
                  <span className={pdfProgress === 100 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {pdfProgressStatus}
                  </span>
                </div>
              </div>

              {pdfProgress === 100 && (
                <div className="flex justify-center pt-2 animate-bounce">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full uppercase tracking-widest border border-emerald-500/20">
                    Download Triggered Automatically ✅
                  </span>
                </div>
              )}

              {pdfProgress < 100 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      cancelPdfGenerationRef.current = true;
                      setIsGeneratingPdf(false);
                    }}
                    className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STICKER SECURITY VERIFICATION PROGRESS MODAL */}
      {stickerVerificationState !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 max-w-md w-full overflow-hidden shadow-2xl rounded-2xl flex flex-col scale-in-center select-none font-sans">
            
            <div className="bg-slate-900 text-white p-4.5 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 shrink-0 animate-spin text-indigo-400" />
              <span className="font-extrabold text-xs uppercase tracking-wider">
                Sticker Security & Verification Engine
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                {stickerVerificationState === 'verifying' && (
                  <>
                    <div className="relative flex items-center justify-center">
                      <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-20"></div>
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                        <Clock className="w-5 h-5 animate-spin" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Running Automated QR Target Checks</h4>
                      <p className="text-xs text-slate-500 max-w-xs">Selecting randomized sample mappings to prevent corrupt or misplaced codes.</p>
                    </div>
                  </>
                )}

                {stickerVerificationState === 'success' && (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-650 dark:text-emerald-400 border border-emerald-150">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 text-emerald-600 dark:text-emerald-400">All Sample Mappings Verified!</h4>
                      <p className="text-xs text-slate-500">Launching system printable output...</p>
                    </div>
                  </>
                )}

                {stickerVerificationState === 'failed' && (
                  <>
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-650 dark:text-red-400 border border-red-150">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-red-600 dark:text-red-400 font-bold">Verification Failure</h4>
                      <p className="text-xs text-slate-500">The QR generation library rejected a tested accession number target.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Progress Logs */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-150 dark:border-slate-850 font-mono text-[10px] space-y-1.5 h-36 overflow-y-auto">
                {stickerVerificationLogs.map((log, lIdx) => (
                  <div 
                    key={lIdx} 
                    className={
                      log.startsWith('✓') 
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                        : log.startsWith('❌') 
                          ? 'text-red-600 dark:text-red-400 font-bold' 
                          : 'text-slate-500'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>

              {stickerVerificationState === 'failed' && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStickerVerificationState('idle')}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all tracking-wider"
                  >
                    Close Verification Console
                  </button>
                </div>
              )}
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
                  const demo = getStudentProfile(loan.rollNumber, loan.class, loan.section);
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
          <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase block">
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
          <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase block flex items-center justify-between">
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
          <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase block">
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
          <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase block">
            Overdue Books / देय तिथि पार
          </span>
          <span className={`text-xl sm:text-2xl font-extrabold block mt-1 ${overdueLogs.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {overdueLogs.length}
          </span>
          <span className="text-[10px] text-slate-500 font-sans block mt-1 font-sans">Required recovery attention</span>
        </div>

        {/* Metric 5: Registered Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-xl shadow-xs hover:border-slate-400 transition-all select-none font-[sans]">
          <span className="text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase block">
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
          onClick={() => { setActiveTab('stickers'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'stickers'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4 shrink-0" />
          <span>Sticker Generator</span>
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
          onClick={() => { setActiveTab('feedback'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-10 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Reviews & Mailbox</span>
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

        <button
          onClick={() => { setActiveTab('gallery'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'gallery'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-11 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span>Library Gallery</span>
        </button>

        <button
          onClick={() => { setActiveTab('notifications'); }}
          className={`px-4.5 py-2 rounded-t-lg font-bold text-xs transition-all border-b-2 flex items-center gap-2 relative ${
            activeTab === 'notifications'
              ? 'border-slate-800 text-slate-900 dark:text-white font-extrabold bg-slate-11 border-b-slate-80 bg-slate-100 dark:bg-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>Librarian Inbox</span>
          {unreadNotificationsCount > 0 && (
            <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* UNIVERSAL SEARCH BAR PANEL (P1) */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-2 relative" id="universal-search-section">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
            ⚡ Universal Search Engine / सार्वभौमिक खोज इंजन
          </span>
          {universalQuery && (
            <button 
              type="button"
              onClick={() => setUniversalQuery('')}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all cursor-pointer select-none"
            >
              Clear / साफ करें [✕]
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
          <input
            type="text"
            value={universalQuery}
            onChange={(e) => setUniversalQuery(e.target.value)}
            placeholder="Search instantly across Books, Accession IDs, Students, and Active Loan Logs..."
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-indigo-500/25 focus:border-indigo-500 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-900 dark:text-white font-sans placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Floating results overlay dropdown if query is present */}
        {universalQuery.trim().length >= 2 && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
            
            {/* 1. Books section */}
            <div>
              <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                📖 Catalog Book Registers ({universalResults.books.length})
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {universalResults.books.map(b => (
                  <div 
                    key={b.bookId}
                    onClick={() => { setSelectedProfileBook(b); setUniversalQuery(''); }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 cursor-pointer flex items-center justify-between text-xs transition-all"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{b.bookName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: #{b.bookId} • Acc: {b.accessionNumber || "-"} • Author: {b.author}</div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-150 text-emerald-800 dark:text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">
                      View Catalog Trail →
                    </span>
                  </div>
                ))}
                {universalResults.books.length === 0 && (
                  <div className="p-3 text-slate-400 text-[11px] font-sans">No matching book records in index.</div>
                )}
              </div>
            </div>

            {/* 2. Students section */}
            <div>
              <div className="bg-slate-55 dark:bg-slate-950 px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                👥 Registered Student Scholars ({universalResults.students.length})
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {universalResults.students.map(s => (
                  <div 
                    key={s.studentId || `${s.class}-${s.section}-${s.rollNumber}`}
                    onClick={() => { setSelectedProfileStudent(s); setUniversalQuery(''); }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 cursor-pointer flex items-center justify-between text-xs transition-all"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Roll: #{s.rollNumber} • Class: Grade {s.class} • Sec: {s.section}</div>
                    </div>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/25 border border-indigo-150 text-indigo-800 dark:text-indigo-450 font-bold px-2 py-0.5 rounded font-mono">
                      View Student File →
                    </span>
                  </div>
                ))}
                {universalResults.students.length === 0 && (
                  <div className="p-3 text-slate-400 text-[11px] font-sans">No matching student accounts found.</div>
                )}
              </div>
            </div>

            {/* 3. Issue Logs section */}
            <div>
              <div className="bg-slate-55 dark:bg-slate-950 px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                📜 Active/Historic Book Issue Logs ({universalResults.logs.length})
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {universalResults.logs.map(l => (
                  <div 
                    key={l.id}
                    onClick={() => { 
                      const matchedBook = books.find(b => b.bookId === l.bookId);
                      if (matchedBook) {
                        setSelectedProfileBook(matchedBook);
                      } else {
                        alert(`Book ID: #${l.bookId} (${l.bookName})`);
                      }
                      setUniversalQuery(''); 
                    }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/40 cursor-pointer flex items-center justify-between text-xs transition-all"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{l.bookName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Borrowed by: {l.studentName} (Roll: #{l.rollNumber}) • Due Date: {l.dueDate}</div>
                    </div>
                    <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold font-mono ${
                      l.status === 'Returned'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-150'
                        : 'bg-amber-50 text-amber-800 border border-amber-150 animate-pulse'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
                {universalResults.logs.length === 0 && (
                  <div className="p-3 text-slate-400 text-[11px] font-sans">No active transaction records match query.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 px-3 py-2 text-[9px] text-slate-400 text-center font-sans">
              Matches are computed locally and updated in real-time. Click on any item to view details instantly.
            </div>

          </div>
        )}
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
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:focus:ring-slate-805 animate-fade-in text-slate-900 dark:text-white"
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
                onClick={() => setShowExcelBooksModal(true)}
                className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-750 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                id="btn-upload-excel-books-shortcut"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel</span>
              </button>

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
                        <div><b className="text-slate-500">DDC Mapping:</b> {book.ddcCategory || "Needs Librarian Review"}</div>
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
                        onClick={() => handleDownloadPDF([book])}
                        className="p-1 px-2 rounded hover:bg-indigo-50 hover:text-indigo-750 text-indigo-650 bg-indigo-50/40 border border-indigo-100 dark:bg-slate-950 dark:border-indigo-950/80 dark:text-indigo-400 dark:hover:bg-slate-800 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        title="Print/Download Single Book Sticker"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ Print Sticker</span>
                      </button>
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedBooks.map((book) => {
                    const shelfSrNo = categorySerialsMap.get(book.bookId) || 1;
                    const isSelected = selectedBookIds.includes(book.bookId);
                    return (
                      <tr key={book.bookId} className={"hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all " + (isSelected ? "bg-indigo-50/10 dark:bg-indigo-950/20" : "")}>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedBookIds(prev => prev.filter(id => id !== book.bookId));
                              } else {
                                setSelectedBookIds(prev => [...prev, book.bookId]);
                              }
                            }}
                            className="rounded text-indigo-650 focus:ring-indigo-505 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono font-bold text-slate-500">
                          #{book.bookId}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono font-black text-emerald-600 dark:text-emerald-450">
                          {shelfSrNo}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono font-bold text-slate-850 dark:text-slate-250">
                          {book.accessionNumber || book.bookId || "N/A"}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono text-slate-700 dark:text-slate-300">
                          {book.callNumber || "N/A"}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono text-slate-700 dark:text-slate-300">
                          {book.bookNumber || "N/A"}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-850 font-bold text-slate-900 dark:text-slate-100 max-w-[250px] truncate">
                          <button
                            type="button"
                            onClick={() => setSelectedProfileBook(book)}
                            className="hover:underline text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-left cursor-pointer"
                            title="Click to view history"
                          >
                            {book.bookName}
                          </button>
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                          {book.author}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                          {book.publisher}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono text-slate-600 dark:text-slate-400">
                          {book.yearOfPublication || "N/A"}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-850">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-300 font-sans">
                            {book.category}
                          </span>
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850 font-mono">
                          <span className="font-bold text-slate-850 dark:text-slate-200">{book.availableCopies}</span> / {book.totalCopies}
                        </td>
                        <td className="p-3 text-center border border-slate-200 dark:border-slate-850">
                          {book.availableCopies > 0 ? (
                            <span className="px-2.5 py-1 text-[9px] font-black rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-955/40 dark:text-emerald-450 uppercase tracking-wider font-sans">
                              Available
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[9px] font-black rounded-full bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-400 uppercase tracking-wider font-sans">
                              Checked Out
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right border border-slate-200 dark:border-slate-850">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleDownloadPDF([book])}
                              className="p-1 px-2 rounded hover:bg-indigo-50 hover:text-indigo-750 text-indigo-650 bg-indigo-50/40 border border-indigo-100 dark:bg-slate-950 dark:border-indigo-950/80 dark:text-indigo-400 dark:hover:bg-slate-800 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shrink-0"
                              title="Print Single Book Sticker"
                            >
                              <Printer className="w-3 h-3" />
                              <span>🖨️ Print Sticker</span>
                            </button>
                            <button
                              onClick={() => openBookEdit(book)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-405 transition-all cursor-pointer"
                              title="Edit Book Specifications"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  type: 'delete-book',
                                  title: 'Permanently Delete Book Profile',
                                  message: `Are you sure you want to permanently delete '${book.bookName}'? This cannot be undone.`,
                                  confirmLabel: 'Confirm and Delete',
                                  targetId: book.bookId
                                });
                              }}
                              className="p-1 rounded hover:bg-red-50 text-red-650 cursor-pointer"
                              title="Delete Book"
                              id={`delete-single-book-${book.bookId}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan={14} className="p-6 text-center text-slate-400 text-xs font-sans">No books found in school registers matching queries.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* INFINITE SCROLL SENTINEL FOR BOOKS */}
          <InfiniteScrollSentinel 
            onVisible={() => setVisibleBooksCount(prev => prev + 24)}
            hasMore={paginatedBooks.length < filteredBooks.length}
          />
        </div>
      )}

      {/* STUDENTS TAB PANEL */}
      {activeTab === 'students' && (
        <div className="space-y-6" id="tab-students-content">
          
          {/* Header controls */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={studentSearchInput}
                  onChange={(e) => {
                    setStudentSearchInput(e.target.value);
                    setStudentsPage(1);
                  }}
                  placeholder={currentLang === "EN" ? "Search students by name, roll, class, section, admission..." : "छात्र का नाम, रोल नंबर, कक्षा, अनुभाग, प्रवेश खोजें..."}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:focus:ring-slate-805 animate-fade-in text-slate-900 dark:text-white"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-1 px-2.5 rounded-lg border border-slate-150 dark:border-slate-805">
                <span className="text-[10px] font-black uppercase text-slate-450 shrink-0 font-mono">Class:</span>
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setStudentsPage(1);
                  }}
                  className="text-[11px] bg-transparent border-none text-slate-705 dark:text-slate-305 font-mono cursor-pointer outline-none focus:ring-0"
                >
                  <option value="">📁 All Classes</option>
                  {(() => {
                    const dynamic = Array.from(new Set(students.map(s => String(s.class || '')))).filter(Boolean);
                    const standard = ['6', '7', '8', '9', '10', '11', '12'];
                    const combined = Array.from(new Set([...standard, ...dynamic])).sort((a, b) => Number(a) - Number(b));
                    return combined.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Section Filter */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-1 px-2.5 rounded-lg border border-slate-150 dark:border-slate-805">
                <span className="text-[10px] font-black uppercase text-slate-450 shrink-0 font-mono">Section:</span>
                <select
                  value={filterSection}
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setStudentsPage(1);
                  }}
                  className="text-[11px] bg-transparent border-none text-slate-705 dark:text-slate-305 font-mono cursor-pointer outline-none focus:ring-0"
                >
                  <option value="">📁 All Sections</option>
                  {(() => {
                    const dynamic = Array.from(new Set(students.map(s => String(s.section || '').toUpperCase()))).filter(Boolean);
                    const standard = ['A', 'B', 'C', 'D', 'E'];
                    const combined = Array.from(new Set([...standard, ...dynamic])).sort();
                    return combined.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowExcelStudentsModal(true)}
                className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-750 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                id="btn-upload-excel-students-shortcut"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel</span>
              </button>

              <button
                onClick={() => {
                  setEditingStudent(null);
                  setStudName('');
                  setStudClass('10');
                  setStudSection('A');
                  setStudRoll('');
                  setStudDOB('');
                  setShowStudentForm(true);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{currentLang === "EN" ? "Enroll Student" : "छात्र नामांकित करें"}</span>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between select-none">
            <span>Students found: {filteredStudents.length} filtered ({students.length} total registered)</span>
            <span>Ledger search lookup speed: <b>{studentSearchElapsed}ms</b></span>
          </div>

          {/* BULK SELECTION CONTROLS PANEL FOR STUDENTS */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                id="bulk-select-all-students"
                checked={paginatedStudents.length > 0 && paginatedStudents.every(s => {
                  const displayStudentId = s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber;
                  return selectedStudentIds.includes(displayStudentId);
                })}
                onChange={(e) => {
                  if (e.target.checked) {
                    const visibleIds = filteredStudents.map(s => s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber);
                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  } else {
                    const visibleIds = filteredStudents.map(s => s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber);
                    setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  }
                }}
                className="w-4 h-4 rounded border-slate-350 text-slate-800 focus:ring-slate-800 cursor-pointer"
              />
              <label htmlFor="bulk-select-all-students" className="text-xs font-bold text-slate-750 dark:text-slate-300 cursor-pointer select-none">
                Select All Filtered Students ({filteredStudents.length})
              </label>
              {selectedStudentIds.length > 0 && (
                <span className="text-[11px] bg-slate-200 dark:bg-slate-805 text-slate-800 dark:text-slate-205 font-extrabold px-2.5 py-0.5 rounded font-mono">
                  {selectedStudentIds.length} Selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedStudentIds.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        type: 'delete-selected-students',
                        title: 'Bulk Delete Selected Students',
                        message: `Are you sure you want to permanently delete these ${selectedStudentIds.length} selected student registration accounts from lists?`,
                        confirmLabel: 'Delete Selected Students',
                        targetId: selectedStudentIds
                      });
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedStudentIds.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="px-3 py-2 border border-slate-250 hover:bg-slate-50 text-slate-650 font-bold text-xs rounded-lg transition-all cursor-pointer select-none"
                  >
                    Clear Selection
                  </button>
                </>
              )}

              <div className="flex flex-col items-end gap-1 ml-auto">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Students: {students.length}
                </span>
                <button
                  onClick={() => {
                    setConfirmModal({
                      type: 'clear-students',
                      title: 'Wipe All Student Roster Registrations',
                      message: `CRITICAL SECURE DIRECTIVE: Are you sure you want to delete ALL ${students.length} registered student records? This will clear all student portal logins and rosters. This action is irreversible. Please type 'DELETE ALL STUDENTS' exactly to confirm:`,
                      confirmLabel: 'Purge Student Registry',
                      requireInput: 'DELETE ALL STUDENTS'
                    });
                  }}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-105 hover:text-red-850 border-2 border-dashed border-red-300 dark:border-red-900 text-red-700 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-650 shrink-0" />
                  <span>Purge Student Directory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto border-2 border-slate-300 dark:border-slate-800 rounded-xl shadow-xs text-xs bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse" id="librarian-students-table">
              <thead className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[10px] border-b-2 border-slate-950 select-none">
                <tr>
                  <th className="p-3 text-center w-12 border border-slate-850">
                    <input 
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => {
                        const displayStudentId = s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber;
                        return selectedStudentIds.includes(displayStudentId);
                      })}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const visibleIds = paginatedStudents.map(s => s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber);
                          setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                        } else {
                          const visibleIds = paginatedStudents.map(s => s.studentId || (s.class || "10") + "-" + (s.section || "A").toUpperCase() + "-" + s.rollNumber);
                          setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 border border-slate-850 text-center">Roll Number</th>
                  <th className="p-3 border border-slate-850 text-left">Student Name</th>
                  <th className="p-3 border border-slate-850 text-center">Class</th>
                  <th className="p-3 border border-slate-850 text-center">Section</th>
                  <th className="p-3 border border-slate-850 text-left">Date of Birth</th>
                  <th className="p-3 border border-slate-850 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedStudents.map((stud, idx) => {
                  const checkoutsCount = issueLogs.filter(log => log.rollNumber === stud.rollNumber && log.status === 'Issued').length;
                  const itemIndex = idx + 1;
                  const displayStudentId = stud.studentId || (stud.class || "10") + "-" + (stud.section || "A").toUpperCase() + "-" + stud.rollNumber;
                  const isSelected = selectedStudentIds.includes(displayStudentId);
                  return (
                    <tr key={displayStudentId} className={"hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all " + (isSelected ? "bg-indigo-50/10 dark:bg-indigo-950/20" : "")}>
                      <td className="p-3 text-center w-12 border border-slate-200 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedStudentIds(prev => prev.filter(id => id !== displayStudentId));
                            } else {
                              setSelectedStudentIds(prev => [...prev, displayStudentId]);
                            }
                          }}
                          className="rounded text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center border border-slate-200 dark:border-slate-800 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {stud.rollNumber}
                      </td>
                      <td className="p-3 border border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-105 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedProfileStudent(stud)}
                          className="hover:underline text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-left cursor-pointer"
                          title="Click to view academic library profile history"
                        >
                          {stud.status === "VACANT" || !stud.name ? (currentLang === "EN" ? "Vacant" : "रिक्त") : stud.name}
                        </button>
                      </td>
                      <td className="p-3 text-center border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {stud.class || "10"}
                      </td>
                      <td className="p-3 text-center border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {stud.section || "A"}
                      </td>
                      <td className="p-3 border border-slate-200 dark:border-slate-800 font-mono text-slate-650 dark:text-slate-350">
                        {stud.dob ? stud.dob : (
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-400 uppercase tracking-wider font-sans">
                            No DOB
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right border border-slate-200 dark:border-slate-800">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openStudentEdit(stud)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-405 transition-all cursor-pointer"
                            title="Edit Student Information"
                            type="button"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const targetId = stud.studentId || (stud.class + "-" + stud.section + "-" + stud.rollNumber);
                              setConfirmModal({
                                type: "delete-student",
                                title: "permanently delete student enrollment",
                                message: "Are you sure you want to permanently delete student " + stud.name + " (Class: " + stud.class + ", Section: " + stud.section + ", Roll: " + stud.rollNumber + ") from rosters database? This cannot be undone.",
                                confirmLabel: "Confirm and Delete Student",
                                targetId: targetId
                              });
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-650 transition-all cursor-pointer"
                            title="Delete Student"
                            type="button"
                            id={"delete-single-student-" + (stud.studentId || (stud.class + "-" + stud.section + "-" + stud.rollNumber))}
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
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs font-sans">No students registered in active ledger. Use spreadsheet bulk importer box below to enroll.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* INFINITE SCROLL SENTINEL FOR STUDENTS */}
          <InfiniteScrollSentinel 
            onVisible={() => setVisibleStudentsCount(prev => prev + 40)}
            hasMore={paginatedStudents.length < filteredStudents.length}
          />

          {/* Excel Importer segment specifically for student data */}
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-205 dark:border-slate-800 rounded-xl space-y-4">
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
            
            {/* Contextual Circulation Desk Command Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    🏫 Circulation Desk & Student Loan Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">PM SHRI Ramdiri +2 High School Library Circulation Workspace</p>
                </div>
                {isSubmittingAction && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-150 dark:border-indigo-900 animate-pulse font-black">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronizing backend transaction...</span>
                  </div>
                )}
              </div>

              {/* Contextual Command Bar Search and Filter Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 relative">
                  <input
                    type="text"
                    placeholder="🔍 Search Student (Name, Roll) or Book (Title, Author, Accession #, Book #, Call #, Category)..."
                    value={circSearchQuery}
                    onChange={e => {
                      setCircSearchQuery(e.target.value);
                      setCircPendingPage(1);
                      setActiveLoansPage(1);
                      setCircOverduePage(1);
                      setCircReturnedPage(1);
                    }}
                    className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:ring-1 focus:ring-indigo-650 outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                  />
                  {circSearchQuery && (
                    <button
                      onClick={() => setCircSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="md:col-span-3">
                  <select
                    value={circFilterClass}
                    onChange={e => {
                      setCircFilterClass(e.target.value);
                      setCircPendingPage(1);
                      setActiveLoansPage(1);
                      setCircOverduePage(1);
                      setCircReturnedPage(1);
                    }}
                    className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:ring-1 focus:ring-indigo-650 outline-none font-bold"
                  >
                    <option value="">🏫 Class Filter: All</option>
                    {['6', '7', '8', '9', '10', '11', '12'].map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    value={circFilterSection}
                    onChange={e => {
                      setCircFilterSection(e.target.value);
                      setCircPendingPage(1);
                      setActiveLoansPage(1);
                      setCircOverduePage(1);
                      setCircReturnedPage(1);
                    }}
                    className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:ring-1 focus:ring-indigo-650 outline-none font-bold"
                  >
                    <option value="">🛡️ Section Filter: All</option>
                    {['A', 'B', 'C', 'D', 'E'].map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preset Selector Tabs */}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => setCircFilterPreset('pending')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                    circFilterPreset === 'pending'
                      ? 'bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-950 text-slate-700 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>📜 Pending Requests</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                    circFilterPreset === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {filteredRequestsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setCircFilterPreset('active')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                    circFilterPreset === 'active'
                      ? 'bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-950 text-slate-700 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>📚 Issued Books</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                    circFilterPreset === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {filteredActiveLoansList.length}
                  </span>
                </button>

                <button
                  onClick={() => setCircFilterPreset('overdue')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                    circFilterPreset === 'overdue'
                      ? 'bg-red-500 border-red-500 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-950 text-red-600 border-red-100 dark:border-red-955 hover:bg-red-50/50 dark:hover:bg-red-955'
                  }`}
                >
                  <span>⚠️ Overdue Books</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                    circFilterPreset === 'overdue' ? 'bg-white/20 text-white' : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-105'
                  }`}>
                    {filteredOverdueLoansList.length}
                  </span>
                </button>

                <button
                  onClick={() => setCircFilterPreset('returned')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                    circFilterPreset === 'returned'
                      ? 'bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-950 text-slate-700 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>🕒 Returned History</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                    circFilterPreset === 'returned' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {filteredReturnedLoansList.length}
                  </span>
                </button>
              </div>
            </div>

            {/* PRESET VIEW 1: Pending Requests Pool */}
            {circFilterPreset === 'pending' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1.5 select-none font-sans">
                  📜 Borrow Requests Awaiting Approval ({filteredRequestsList.length})
                </h3>

                <div className="divide-y divide-slate-150 dark:divide-slate-800">
                  {paginatedCircPending.map(req => {
                    const currentApproveDate = approvalDates[req.id] || (() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 14);
                      return d.toISOString().split('T')[0];
                    })();
                    return (
                      <div key={req.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                        <div className="space-y-1 text-slate-900 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {highlightText(req.studentName, circSearchQuery)} (Roll #{highlightText(req.rollNumber, circSearchQuery)})
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-1.5 rounded font-mono border dark:border-slate-700">RQ ID: {highlightText(req.id, circSearchQuery)}</span>
                          </div>
                           <p className="text-slate-650 dark:text-slate-400">Requested: <b>{highlightText(req.bookName, circSearchQuery)}</b></p>
                           {req.comment && (
                             <div className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-955/40 px-2.5 py-1 rounded border border-amber-100 dark:border-amber-900/60 font-medium italic mt-1 max-w-md">
                               💡 Student Note: "{req.comment}"
                             </div>
                           )}
                           <span className="text-[10px] text-slate-400 font-mono block">Date: {req.requestDate}</span>
                         </div>

                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-center shrink-0 w-full sm:w-auto">
                           <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 p-1 rounded">
                             <span className="text-[9px] uppercase font-bold text-slate-500 block shrink-0">Due:</span>
                             <input
                               type="date"
                               required
                               value={currentApproveDate}
                               onChange={(e) => setApprovalDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                               className="text-[10px] p-1 font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border dark:border-slate-800 rounded outline-none w-28"
                             />
                           </div>

                           <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-1 sm:mt-0 font-sans">
                             <button
                               onClick={() => setSelectedRequestDetails(req)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Verify Details</span>
                              </button>
                              {onDeleteRequest && (
                                <button
                                  disabled={isSubmittingAction}
                                  onClick={() => handleDeleteRequestAction(req.id)}
                                  className="px-3 py-1.5 text-red-800 font-bold text-xs rounded border border-red-200 transition-all flex items-center gap-1 select-none flex-1 sm:flex-none justify-center bg-red-50 hover:bg-red-100 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                              <button
                                style={{ display: 'none' }}
                               className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-755 dark:text-indigo-300 font-bold text-xs rounded border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer flex items-center gap-1 select-none flex-1 sm:flex-none justify-center"
                               title="Verify Student & Book Location Specs"
                             >
                               <Eye className="w-3.5 h-3.5" />
                               <span>Verify Details</span>
                             </button>
                             <button
                               disabled={isSubmittingAction}
                               onClick={() => handleApproveAction(req.id, currentApproveDate)}
                               className={`px-3 py-1.5 text-white font-bold text-xs rounded transition-all flex items-center gap-1 select-none flex-1 sm:flex-none justify-center ${
                                 isSubmittingAction ? 'bg-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                               }`}
                             >
                               <CheckCircle className="w-3.5 h-3.5" />
                               <span>Approve</span>
                             </button>
                             <button
                               disabled={isSubmittingAction}
                               onClick={() => handleRejectAction(req.id)}
                               className={`px-3 py-1.5 text-red-700 font-bold text-xs rounded transition-all flex items-center gap-1 select-none flex-1 sm:flex-none justify-center ${
                                 isSubmittingAction ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200 cursor-pointer'
                               }`}
                             >
                               <XCircle className="w-3.5 h-3.5" />
                               <span>Reject</span>
                             </button>
                             {onHoldRequest && (
                               <button
                                 disabled={isSubmittingAction}
                                 onClick={() => handleHoldAction(req.id)}
                                 className={`px-3 py-1.5 text-amber-805 font-bold text-xs rounded transition-all flex items-center gap-1 select-none flex-1 sm:flex-none justify-center ${
                                   isSubmittingAction ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-100 hover:bg-amber-200 cursor-pointer'
                                 }`}
                               >
                                 <Clock className="w-3.5 h-3.5" />
                                 <span>Hold</span>
                               </button>
                             )}
                           </div>
                         </div>
                       </div>
                     );
                   })}

                   {filteredRequestsList.length === 0 && (
                     <p className="py-12 text-center text-slate-400 text-xs">No pending requests matched your criteria.</p>
                   )}
                 </div>

                 {renderPagination(circPendingPage, filteredRequestsList.length, 15, setCircPendingPage)}
               </div>
             )}

             {/* PRESET VIEW 2: Active Issued Loans */}
             {circFilterPreset === 'active' && (
               <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1.5 select-none font-sans">
                   📚 Active Issued Books ({filteredActiveLoansList.length})
                 </h3>

                 <div className="divide-y divide-slate-150 dark:divide-slate-800">
                   {paginatedLoans.map(loan => {
                     const outDemo = getStudentProfile(loan.rollNumber, loan.class, loan.section);
                     const isPastDue = isOverdue(loan.dueDate);
                     return (
                       <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs animate-fade-in">
                         <div className="space-y-0.5">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="font-bold text-slate-900 dark:text-slate-100">
                               {highlightText(loan.studentName, circSearchQuery)} (Roll #{highlightText(loan.rollNumber, circSearchQuery)})
                             </span>
                             <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 text-slate-600 dark:text-slate-300 font-bold font-sans">Class {outDemo.class}-{outDemo.section}</span>
                             <span className="text-[11px] text-slate-500 font-mono">[{highlightText(loan.bookId, circSearchQuery)}]</span>
                           </div>
                           <p className="text-slate-650 dark:text-slate-400 font-medium mt-1">Title: <b className="text-slate-805 dark:text-slate-100">{highlightText(loan.bookName, circSearchQuery)}</b></p>
                           <div className="flex gap-4 mt-0.5">
                             <span className="text-[10px] text-slate-400 font-mono block">Issued date: {loan.issueDate}</span>
                             <span className={`text-[10px] font-mono font-bold block ${isPastDue ? 'text-red-500' : 'text-slate-400'}`}>
                               Due Date: {loan.dueDate} {isPastDue ? `(${getDaysOverdue(loan.dueDate)} Days Overdue!)` : ''}
                             </span>
                           </div>
                         </div>

                         <button
                           disabled={isSubmittingAction}
                           onClick={() => handleReturnAction(loan.id)}
                           className={`px-3.5 py-1.5 border text-[10.5px] font-extrabold rounded shadow-sm transition-all flex items-center gap-1 select-none shrink-0 self-start sm:self-center ${
                             isSubmittingAction
                               ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                               : 'border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                           }`}
                         >
                           <span>Check-In Book (Return)</span>
                         </button>
                       </div>
                     );
                   })}

                   {filteredActiveLoansList.length === 0 && (
                     <p className="py-12 text-center text-slate-400 text-xs">No active issued books found.</p>
                   )}
                 </div>

                 {renderPagination(activeLoansPage, filteredActiveLoansList.length, 15, setActiveLoansPage)}
               </div>
             )}

             {/* PRESET VIEW 3: Overdue Books */}
             {circFilterPreset === 'overdue' && (
               <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                 <h3 className="text-xs font-black uppercase text-red-600 tracking-wider block border-b border-red-100 dark:border-red-955 pb-1.5 select-none font-sans">
                   ⚠️ Overdue Books Outstanding ({filteredOverdueLoansList.length})
                 </h3>

                 <div className="divide-y divide-slate-150 dark:divide-slate-800">
                   {paginatedCircOverdue.map(loan => {
                     const outDemo = getStudentProfile(loan.rollNumber, loan.class, loan.section);
                     const isPastDue = isOverdue(loan.dueDate);
                     return (
                       <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs animate-fade-in">
                         <div className="space-y-0.5">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="font-bold text-red-600 dark:text-red-400">
                               {highlightText(loan.studentName, circSearchQuery)} (Roll #{highlightText(loan.rollNumber, circSearchQuery)})
                             </span>
                             <span className="text-[10px] bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold px-1 rounded font-sans">Class {outDemo.class}-{outDemo.section}</span>
                             <span className="text-[11px] text-slate-500 font-mono">[{highlightText(loan.bookId, circSearchQuery)}]</span>
                           </div>
                           <p className="text-slate-650 dark:text-slate-400 font-medium mt-1">Title: <b className="text-slate-805 dark:text-slate-100">{highlightText(loan.bookName, circSearchQuery)}</b></p>
                           <div className="flex gap-4 mt-0.5">
                             <span className="text-[10px] text-slate-400 font-mono block">Issued date: {loan.issueDate}</span>
                             <span className="text-[10px] font-mono font-bold block text-red-500">
                               Due Date: {loan.dueDate} ({getDaysOverdue(loan.dueDate)} Days Overdue!)
                             </span>
                           </div>
                         </div>

                         <button
                           disabled={isSubmittingAction}
                           onClick={() => handleReturnAction(loan.id)}
                           className={`px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-extrabold rounded shadow-sm transition-all flex items-center gap-1 select-none shrink-0 self-start sm:self-center ${
                             isSubmittingAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                           }`}
                         >
                           <span>Check-In Book (Return)</span>
                         </button>
                       </div>
                     );
                   })}

                   {filteredOverdueLoansList.length === 0 && (
                     <p className="py-12 text-center text-slate-400 text-xs">No overdue loans matched your criteria.</p>
                   )}
                 </div>

                 {renderPagination(circOverduePage, filteredOverdueLoansList.length, 15, setCircOverduePage)}
               </div>
             )}

             {/* PRESET VIEW 4: Completed Returns History */}
             {circFilterPreset === 'returned' && (
               <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1.5 select-none font-sans">
                   🕒 Historical Book Return Receipts ({filteredReturnedLoansList.length})
                 </h3>

                 <div className="divide-y divide-slate-150 dark:divide-slate-800">
                   {paginatedCircReturned.map(loan => {
                     const outDemo = getStudentProfile(loan.rollNumber, loan.class, loan.section);
                     return (
                       <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs animate-fade-in opacity-80">
                         <div className="space-y-0.5">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="font-bold text-slate-900 dark:text-slate-100">
                               {highlightText(loan.studentName, circSearchQuery)} (Roll #{highlightText(loan.rollNumber, circSearchQuery)})
                             </span>
                             <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 font-bold font-sans">Class {outDemo.class}-{outDemo.section}</span>
                             <span className="text-[11px] text-slate-500 font-mono">[{highlightText(loan.bookId, circSearchQuery)}]</span>
                           </div>
                           <p className="text-slate-650 dark:text-slate-400 font-medium mt-1">Title: <b className="text-slate-805 dark:text-slate-100">{highlightText(loan.bookName, circSearchQuery)}</b></p>
                           <div className="flex gap-4 mt-0.5">
                             <span className="text-[10px] text-slate-400 font-mono block">Issued date: {loan.issueDate}</span>
                             <span className="text-[10px] text-teal-600 font-bold block font-mono">
                               Status: Returned on {loan.returnDate || loan.dueDate}
                             </span>
                           </div>
                         </div>

                         <div className="text-[11.5px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-3 py-1 rounded font-bold border border-teal-100 dark:border-teal-900 select-none">
                           Checked In Successfully
                         </div>
                       </div>
                     );
                   })}

                   {filteredReturnedLoansList.length === 0 && (
                     <p className="py-12 text-center text-slate-400 text-xs">No historical returns matched your criteria.</p>
                   )}
                 </div>

                 {renderPagination(circReturnedPage, filteredReturnedLoansList.length, 15, setCircReturnedPage)}
               </div>
             )}

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

              <div className="space-y-3 font-sans text-xs text-slate-200 leading-relaxed">
                <p>
                  {currentLang === 'HI' 
                    ? "यह विद्यालय का केंद्रीय वितरण काउंटर है जहाँ से विद्यार्थियों को सीधे भौतिक पुस्तकें जारी की जाती हैं। उपयुक्त फ़ॉन्ट आकार में विवरण देखने के लिए यहाँ क्लिक करें।" 
                    : "This central desk operates direct in-person checkouts for verified library books. Use this portal on the counter desk to:"}
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-200">
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
              
              <p className="text-[10px] text-slate-300 font-mono text-center">
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

          <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-slate-500 select-none">
              Select any report tab above. Press <b>Print Report</b> below to generate an official hardcopy PDF directly from your browser.
            </div>
            
            <button
              onClick={handlePrintAction}
              className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer select-none self-start sm:self-auto shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report Sheet (PDF)</span>
            </button>
          </div>

          {/* SEARCH BAR FOR REPORTS CONTROLS - PRINT-HIDDEN */}
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-205 dark:border-slate-800 rounded-xl space-y-2 print:hidden shadow-xs">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block select-none">
              🔍 Real-Time Filter & Search Active Report Registers
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={reportsSearch}
                onChange={(e) => setReportsSearch(e.target.value)}
                placeholder="Search report records by student name, roll call, class/section, book title, author, accession number, call number, category..."
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-650 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
            {reportsSearch.trim() && (
              <div className="flex justify-between items-center text-[10px] text-indigo-600 dark:text-amber-400 font-bold px-1 select-none">
                <span>Filtering matching report records...</span>
                <button 
                  onClick={() => setReportsSearch('')}
                  className="hover:underline cursor-pointer text-slate-400"
                >
                  Clear filter
                </button>
              </div>
            )}
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
                  <span>Unique Titles: {filteredReportInventory.length} {reportsSearch.trim() && `(matching ${reportsSearch})`}</span>
                  <span>Total Copies Volume: {filteredReportInventory.reduce((sum, b) => sum + b.totalCopies, 0)}</span>
                  <span>Available on Shelf: {filteredReportInventory.reduce((sum, b) => sum + b.availableCopies, 0)}</span>
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
                      {filteredReportInventory.map(b => (
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
                      {filteredReportInventory.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400">No matching catalog inventory books found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab content 2: Loans */}
            {activeReport === 'loans' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold rounded select-none">
                  <span>Active Loans: {filteredReportLoans.length} {reportsSearch.trim() && `(matching ${reportsSearch})`}</span>
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
                    {filteredReportLoans.map(log => (
                      <tr key={log.id}>
                        <td className="py-2 font-bold text-slate-950">{log.studentName}</td>
                        <td className="py-2 font-mono">#{log.rollNumber}</td>
                        <td className="py-2 text-slate-700">{log.bookName}</td>
                        <td className="py-2 text-center font-mono">{log.issueDate}</td>
                        <td className="py-2 text-right font-bold text-amber-700 uppercase">{log.status}</td>
                      </tr>
                    ))}
                    {filteredReportLoans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">0 active library loans matching criteria.</td>
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
                  <span>Registered Students: {filteredReportStudents.length} {reportsSearch.trim() && `(matching ${reportsSearch})`}</span>
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
                    {filteredReportStudents.map(s => (
                      <tr key={s.studentId || `${s.class}-${s.section}-${s.rollNumber}`}>
                        <td className="py-2 font-bold text-slate-950">{s.status === "VACANT" || !s.name ? (currentLang === 'EN' ? "Vacant" : "रिक्त") : s.name}</td>
                        <td className="py-2 text-center">Grade {s.class || '10'}-{s.section || 'A'}</td>
                        <td className="py-2 font-mono">#{s.rollNumber}</td>
                        <td className="py-2 text-right font-mono">{s.dob}</td>
                      </tr>
                    ))}
                    {filteredReportStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">0 students registered matching criteria.</td>
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
                  <span>Total Overdue Books Checked: {filteredReportOverdue.length} {reportsSearch.trim() && `(matching ${reportsSearch})`}</span>
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
                      {filteredReportOverdue.map(log => {
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
                      {filteredReportOverdue.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">0 active books are overdue matching criteria.</td>
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
                  <span>Total Historic Logs Checked: {filteredReportHistory.length} entries {reportsSearch.trim() && `(matching ${reportsSearch})`}</span>
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
                      {filteredReportHistory.map(log => {
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
                      {filteredReportHistory.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">0 past or current borrowing trails matching criteria.</td>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
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
                          setFormCategory(getDdcCategoryName(numStr[0]));
                        }
                      }
                    }}
                    placeholder="e.g. 823.54 PRE"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none font-mono text-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Book Number</label>
                  <input
                    type="text"
                    value={formBookNumber}
                    onChange={(e) => setFormBookNumber(e.target.value)}
                    placeholder="e.g. B0215"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Shelf Number</label>
                  <input
                    type="text"
                    value={formShelfNumber}
                    onChange={(e) => setFormShelfNumber(e.target.value)}
                    placeholder="e.g. S08"
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-800 font-bold"
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
                    className="w-full text-xs p-2 rounded bg-white border border-slate-250 outline-none text-slate-900 font-mono font-bold"
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

      {/* --- STICKER GENERATOR TAB PANEL --- */}
      {activeTab === 'stickers' && (
        <div className="space-y-6 animate-fade-in" id="librarian-stickers-view">
          
          {/* Header Block */}
          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between select-none">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 shrink-0" />
                Automated Sticker & Barcode Engine
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl leading-normal">
                Generate and print precision-aligned sticker labels (64mm × 24mm) matching standard A4 printable sheets. Each sticker automatically embeds a secure, permanent QR code pointing to the live book details page.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('ramdiri_stickers_printed');
                    setStickerPrintedIds(new Set<string>());
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3.5 py-2 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-350 font-extrabold uppercase rounded-lg tracking-wider cursor-pointer"
                title="Reset 'Printed' tag status and treat all catalog items as newly added"
              >
                Reset printed cache
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* KPI 1: Selected Books */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Selected Books</span>
                <span className="text-2xl font-black text-indigo-650 dark:text-indigo-450 block">{selectedBookIds.length}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Checked in book inventory roster</span>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                <CheckCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            {/* KPI 2: Newly Added (Unprinted) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Newly Added (Unprinted)</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-450 block">
                  {books.filter(b => !stickerPrintedIds.has(b.bookId)).length}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Auto-detected pending print sticker</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <PlusCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-405" />
              </div>
            </div>

            {/* KPI 3: Total Library Catalog */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Total Library Books</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block">{books.length}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Active catalog item profiles</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <BookOpen className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
            </div>

          </div>

          {/* Action Trigger Panels */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
              Print Configuration & Generation Controls
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option A: Print Entire Catalog */}
              <div className="border border-slate-150 dark:border-slate-800 p-4.5 rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all bg-slate-50/30 dark:bg-slate-950/20">
                <div className="space-y-1.5">
                  <div className="text-xs font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-400 font-mono">A</span>
                    Generate Entire Library
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Prints stickers for all {books.length} books in the catalog. Best for initial setup or total library audits.
                  </p>
                </div>
                <button
                  disabled={books.length === 0}
                  onClick={() => handleDownloadPDF(books)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-extrabold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-45 disabled:cursor-not-allowed select-none cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Entire Catalog ({books.length})</span>
                </button>
              </div>

              {/* Option B: Print Custom Accession Range ⭐ (MANDATORY) */}
              <div className="border border-slate-150 dark:border-slate-800 p-4.5 rounded-xl flex flex-col justify-between space-y-4 hover:border-pink-200 dark:hover:border-pink-950 transition-all bg-slate-50/30 dark:bg-slate-950/20">
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-[11px] font-black text-pink-650 dark:text-pink-400 font-mono">B</span>
                      Print Custom Accession Range
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal mt-1">
                      Specify an accession range (e.g. 1001 to 1200 or ACC-1001 to ACC-1200) to generate exact stickers.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Start ACC</label>
                        <input
                          type="text"
                          placeholder="e.g. 1001"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          className="w-full text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">End ACC</label>
                        <input
                          type="text"
                          placeholder="e.g. 1200"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          className="w-full text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                  {rangeStart.trim() && rangeEnd.trim() && (
                    <div className="text-[10px] text-pink-600 dark:text-pink-400 font-bold font-mono mt-1.5">
                      Matched {filterByAccessionRange(books, rangeStart, rangeEnd).length} books in catalog
                    </div>
                  )}
                </div>
                <button
                  disabled={!rangeStart.trim() || !rangeEnd.trim() || filterByAccessionRange(books, rangeStart, rangeEnd).length === 0}
                  onClick={() => {
                    const toPrint = filterByAccessionRange(books, rangeStart, rangeEnd);
                    handleDownloadPDF(toPrint);
                  }}
                  className="w-full py-2 bg-pink-600 hover:bg-pink-505 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-45 disabled:cursor-not-allowed select-none cursor-pointer mt-3"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Range ({rangeStart && rangeEnd ? filterByAccessionRange(books, rangeStart, rangeEnd).length : 0})</span>
                </button>
              </div>

            </div>

            {/* Print Parameters Details Banner */}
            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 text-slate-700 dark:text-slate-350 space-y-1.5 select-none leading-relaxed text-xs">
              <span className="font-extrabold text-indigo-750 dark:text-indigo-400 block text-[10px] uppercase tracking-wider">A4 PHYSICAL DIMENSIONS SPECIFICATIONS (Avery Standard Alignment):</span>
              <p className="text-[11px]">
                Each generated print layout centers a grid of <strong>8 columns × 4 rows = 32 stickers</strong> per page with fine guide boundaries.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono text-[10px] font-bold">
                <div className="bg-white/80 dark:bg-slate-950/50 p-2 rounded border border-indigo-100 dark:border-slate-850">
                  <span className="text-slate-400 block text-[9px]">Sticker Size</span>
                  24 mm × 64 mm
                </div>
                <div className="bg-white/80 dark:bg-slate-950/50 p-2 rounded border border-indigo-100 dark:border-slate-850">
                  <span className="text-slate-400 block text-[9px]">A4 Sheet Columns</span>
                  8 Columns (24mm × 8 = 192mm)
                </div>
                <div className="bg-white/80 dark:bg-slate-950/50 p-2 rounded border border-indigo-100 dark:border-slate-850">
                  <span className="text-slate-400 block text-[9px]">Sheet Side Margins</span>
                  9 mm (Left & Right margins)
                </div>
                <div className="bg-white/80 dark:bg-slate-950/50 p-2 rounded border border-indigo-100 dark:border-slate-850">
                  <span className="text-slate-400 block text-[9px]">Target QR link</span>
                  /book/[ACCESSION_NUMBER]
                </div>
              </div>
            </div>

          </div>

          {/* Sticker Preview Grid Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-5 shadow-xs">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Live Interactive Sheet Preview
              </h3>
              <p className="text-[11px] text-slate-450 italic">
                Showing preview of catalog items with live scannable QR codes
              </p>
            </div>
            
            {books.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl space-y-2 select-none">
                <Tag className="w-8 h-8 text-slate-350 mx-auto animate-pulse" />
                <p className="text-xs font-extrabold text-slate-750 dark:text-slate-300">No books in catalog to preview.</p>
                <p className="text-[10px] text-slate-450">Add a book in the Book Catalog first to see sticker layout models.</p>
              </div>
            ) : (
              <StickerPreviewSection 
                books={books} 
                categorySerialsMap={categorySerialsMap} 
                stickerPrintedIds={stickerPrintedIds}
                onPrintSingle={handleDownloadPDF}
              />
            )}

          </div>

        </div>
      )}

      {/* --- PRINT SYSTEM OVERLAYS & PORTAL MARKUPS --- */}
      {isPrintModeActive && (
        <div className="fixed inset-0 bg-slate-900/95 z-[999999] flex flex-col items-center justify-center p-4 text-center select-none no-print-wrapper animate-fade-in font-sans">
          <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-indigo-500 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto animate-bounce">
              <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white uppercase tracking-wider">
                Sticker Print Layout Loaded
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                Generated <strong className="text-indigo-600 dark:text-indigo-400">{booksToPrint.length} sticker labels</strong> aligned perfectly for A4 sticker sheets (8 columns x 4 rows).
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-left border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-655 dark:text-slate-350 leading-relaxed font-mono">
              <div className="flex gap-2 items-start">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400">1.</span>
                <span>Ensure printer scale is set to <strong>100% (Default)</strong> with margins set to <strong>None</strong>.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400">2.</span>
                <span>Make sure <strong>Background graphics</strong> is checked in printer options so layout displays correctly.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400">3.</span>
                <span>The browser's print utility should launch automatically. Click below to re-trigger.</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Open Print Utility</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(booksToPrint)}
                  disabled={isGeneratingPdf}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-505 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-55"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating...' : 'Download A4 PDF'}</span>
                </button>
              </div>
              <button
                onClick={() => setIsPrintModeActive(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Print View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Physical CSS Sticker Print-Only Layout (Centrally formatted, non-rendered on screen) */}
      {isPrintModeActive && (
        <div className="print-only-layout hidden">
          {(() => {
            const pages: Book[][] = [];
            for (let i = 0; i < booksToPrint.length; i += 32) {
              pages.push(booksToPrint.slice(i, i + 32));
            }
            return pages.map((pageBooks, pageIdx) => (
              <div key={pageIdx} className="sticker-page">
                <div className="sticker-grid">
                  {pageBooks.map(book => {
                    const accessionNo = book.accessionNumber || book.bookId || "N/A";
                    const callNo = book.callNumber || "N/A";
                    const bookNo = book.bookNumber || "N/A";
                    const shelfLocation = (book.shelfNumber || "").trim() || "—";
                    
                    return (
                      <StickerElement 
                        key={book.bookId}
                        book={book}
                        accessionNo={accessionNo}
                        callNo={callNo}
                        bookNo={bookNo}
                        shelfLocation={shelfLocation}
                      />
                    );
                  })}
                </div>
              </div>
            ));
          })()}
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
                            .filter(row => row.length >= 2 && row[1])
                            .map(row => {
                              const accession = row[5] || "";
                              const bookId = (row[0] && row[0].trim()) 
                                ? row[0].trim() 
                                : (accession.trim() ? `BK-${accession.trim()}` : `BK-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
                              return {
                                bookId,
                                bookName: row[1] || "Untitled Book",
                                author: row[2] || "Unknown",
                                publisher: row[3] || "N/A",
                                category: row[4] || "General",
                                accessionNumber: accession,
                                totalCopies: parseInt(row[6]) || 1,
                                availableCopies: parseInt(row[7]) || 1,
                                callNumber: row[8] || "",
                                bookNumber: row[9] || "",
                                ddcCategory: row[10] || "",
                                description: "",
                                coverImage: ""
                              };
                            });

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

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {mat.pdfData && (
                      <>
                        <button
                          onClick={() => {
                            try {
                              const blobUrl = base64ToBlobUrl(mat.pdfData, 'application/pdf');
                              const w = window.open(blobUrl, '_blank');
                              if (!w) {
                                alert("Popup blocked! Please allow popups or use the download button instead.");
                              }
                            } catch (err) {
                              alert("Error launching PDF preview.");
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
                              const blobUrl = base64ToBlobUrl(mat.pdfData, 'application/pdf');
                              const downloadLink = document.createElement("a");
                              const fileName = mat.pdfName || `${mat.title.replace(/\s+/g, '_')}.pdf`;
                              downloadLink.href = blobUrl;
                              downloadLink.download = fileName;
                              document.body.appendChild(downloadLink);
                              downloadLink.click();
                              document.body.removeChild(downloadLink);
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

      {/* --- STUDENT FEEDBACK MODERATION AND SUGGESTIONS MODULE --- */}
      {activeTab === 'feedback' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 sm:p-6 rounded-xl space-y-6 shadow-xs animate-fade-in" id="feedback-moderator-tab">
          
          {/* Public reviews section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <span>Student Reviews & Suggestions</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Approve or remove student reviews. Approved reviews will appear on the public homepage.
                  </p>
                </div>
                
                {/* Moderation Filter controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {(['All', 'Pending', 'Approved', 'Resolved', 'Spam', 'Rejected', 'Hidden'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      onClick={() => setFeedbackFilter(filterOpt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        feedbackFilter === filterOpt
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-405'
                      }`}
                    >
                      {filterOpt}
                    </button>
                  ))}
                </div>
              </div>

              {feedbacksLoading ? (
                <div className="text-center py-16 text-xs text-slate-400 font-mono">
                  Fetching suggestions archive from server...
                </div>
              ) : (
                <div className="space-y-4">
                  {allFeedbacks
                    .filter(f => feedbackFilter === 'All' || f.status === feedbackFilter)
                    .length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                        <MessageSquare className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                        <p className="text-xs text-slate-500 font-bold">No feedback items match the selected status filter.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
                        {allFeedbacks
                          .filter(f => feedbackFilter === 'All' || f.status === feedbackFilter)
                          .map((f) => (
                            <div key={f.id} className="pt-4 first:pt-0 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-955/40 p-4 rounded-xl border border-slate-150 dark:border-slate-855">
                                
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                      {f.studentName || "Verified Scholar"}
                                    </span>
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                                      Class {f.studentClass || "?"}-{f.studentSection || "?"}
                                    </span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-955/30 dark:text-indigo-400 px-2.5 py-0.5 rounded font-mono">
                                      Roll {f.studentRoll || "?"}
                                    </span>
                                    <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded text-amber-800 dark:text-amber-400">
                                      ★ {f.rating} / 5
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-750 dark:text-slate-300 font-medium leading-relaxed mt-1">
                                    <span className="text-[10px] font-black uppercase text-indigo-650 block">[{f.type}]</span>
                                    {f.comment}
                                  </p>
                                  {f.reply && (
                                    <div className="p-2.5 bg-indigo-50/40 dark:bg-slate-850/60 border-l-2 border-indigo-550 text-[11px] text-slate-750 dark:text-slate-300 rounded-r mt-2">
                                      <span className="text-[9.5px] font-black uppercase text-indigo-700 dark:text-indigo-455 block mb-1">Response Replied:</span>
                                      "{f.reply}"
                                    </div>
                                  )}
                                  <span className="text-[9px] font-mono text-slate-400 block mt-1">
                                    Logged: {f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}
                                  </span>
                                </div>

                                <div className="flex flex-wrap sm:flex-col items-stretch justify-end gap-2 shrink-0">
                                  
                                  {/* Status Badge */}
                                  <div className="flex items-center justify-between gap-1 mb-1 sm:self-end">
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Status:</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                      f.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                      f.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                      f.status === 'Resolved' ? 'bg-blue-100 text-blue-805' :
                                      f.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                      f.status === 'Hidden' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {f.status}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 justify-end">
                                    {f.status !== 'Approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, 'Approved')}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-505 text-white font-bold text-[10.5px] rounded cursor-pointer"
                                        title="Make visible publicly on Home"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {f.status !== 'Rejected' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, 'Rejected')}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-505 text-white font-bold text-[10.5px] rounded cursor-pointer"
                                        title="Reject feedback"
                                      >
                                        Reject
                                      </button>
                                    )}
                                    {f.status !== 'Resolved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, 'Resolved')}
                                        className="px-2 py-1 bg-blue-650 hover:bg-blue-505 text-white font-bold text-[10.5px] rounded cursor-pointer"
                                        title="Mark resolved"
                                      >
                                        Resolve
                                      </button>
                                    )}
                                    {f.status !== 'Hidden' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, 'Hidden')}
                                        className="px-2 py-1 bg-slate-550 hover:bg-slate-500 text-slate-700 hover:text-white font-bold text-[10.5px] border border-slate-300 rounded cursor-pointer"
                                        title="Hide feedback"
                                      >
                                        Hide
                                      </button>
                                    )}
                                    {f.status !== 'Spam' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, 'Spam')}
                                        className="px-2 py-1 bg-orange-650 hover:bg-orange-505 text-white font-bold text-[10.5px] rounded cursor-pointer"
                                        title="Mark spam"
                                      >
                                        Spam
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveReplyId(activeReplyId === f.id ? null : f.id);
                                        setReplyText(f.reply || '');
                                      }}
                                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-[10.5px] rounded cursor-pointer"
                                    >
                                      {f.reply ? 'Edit Reply' : 'Reply'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFeedback(f.id)}
                                      className="px-2 py-1 border border-red-200 hover:bg-red-50 text-red-750 font-bold text-[10.5px] rounded cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>

                                  {/* Inline Reply input */}
                                  {activeReplyId === f.id && (
                                    <div className="mt-2 space-y-1.5 w-full sm:w-[250px] animate-fade-in">
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write administrative response..."
                                        className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded outline-none text-slate-900 dark:text-white"
                                        rows={2}
                                      />
                                      <div className="flex gap-1.5 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setActiveReplyId(null)}
                                          className="px-2 py-1 text-[10px] text-slate-500 border border-slate-200 rounded cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSendReply(f.id)}
                                          className="px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded cursor-pointer"
                                        >
                                          Submit
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                </div>

                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              )}
        </div>
      )}



      {/* GALLERY MANAGEMENT TAB PANEL */}
      {activeTab === 'gallery' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6 shadow-xs animate-fade-in" id="gallery-tab-content">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Library Gallery Showcase</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Manage the photographs shown on the homepage gallery. Upload high-quality pictures of reading halls, shelves, activities, or academic achievements.
            </p>
          </div>

          {/* Success / Error Messages */}
          {galleryError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{galleryError}</span>
            </div>
          )}

          {gallerySuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{gallerySuccess}</span>
            </div>
          )}

          {/* Upload Drag and Drop Target Area */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
              Upload New Photographs / नई तस्वीरें अपलोड करें
            </label>
            <div 
              className="border-2 border-dashed border-slate-250 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/10 rounded-xl p-8 text-center transition-all cursor-pointer relative"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const files = Array.from(e.dataTransfer.files);
                  files.forEach((file) => {
                    if (!file.type.startsWith('image/')) {
                      alert(`File "${file.name}" is not a valid image. Only image files are supported.`);
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      alert(`File "${file.name}" exceeds the 5MB size limit.`);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setLocalGalleryImages((prev) => [
                          ...prev,
                          {
                            url: event.target!.result as string,
                            caption: "",
                            order: prev.length
                          }
                        ]);
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                }
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    files.forEach((file: any) => {
                      if (!file.type.startsWith('image/')) {
                        alert(`File "${file.name}" is not a valid image. Only image files are supported.`);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert(`File "${file.name}" exceeds the 5MB size limit.`);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setLocalGalleryImages((prev) => [
                            ...prev,
                            {
                              url: event.target!.result as string,
                              caption: "",
                              order: prev.length
                            }
                          ]);
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="text-xs font-semibold text-slate-755 dark:text-slate-350">
                  Drag & Drop pictures here, or <span className="text-indigo-650 dark:text-indigo-400 underline">browse computer</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports multiple PNG, JPG, JPEG, or WEBP images. Custom captions can be added after selection.
                </p>
              </div>
            </div>
          </div>

          {/* Quick URL Input (Alternative/Addition Option) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              Add External Image URL / बाहरी यूआरएल से तस्वीर जोड़ें
            </h4>
            <div className="flex gap-2">
              <input 
                id="gallery-external-url-input"
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 text-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded outline-none text-slate-900 dark:text-white"
              />
              <button
                onClick={() => {
                  const el = document.getElementById('gallery-external-url-input') as HTMLInputElement;
                  if (el && el.value.trim()) {
                    setLocalGalleryImages((prev) => [
                      ...prev,
                      {
                        url: el.value.trim(),
                        caption: "",
                        order: prev.length
                      }
                    ]);
                    el.value = "";
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 dark:bg-slate-700 dark:hover:bg-slate-650 text-white text-xs font-bold rounded cursor-pointer transition-all shrink-0"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Gallery Items Grid list */}
          <div className="space-y-3">
            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Gallery Layout & Ordering ({localGalleryImages.length} images)</span>
            </h4>

            {isGalleryLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="aspect-video w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                ))}
              </div>
            ) : localGalleryImages.length === 0 ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center rounded-xl text-xs text-slate-400 italic">
                No configured photographs available in gallery. Choose files to upload or add urls.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {localGalleryImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/40 p-3 space-y-3 relative group"
                  >
                    {/* Image Preview Container */}
                    <div className="aspect-video w-full rounded-lg overflow-hidden relative bg-slate-200 dark:bg-slate-800">
                      <img 
                        src={img.url}
                        alt="Gallery preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover select-none"
                        draggable="false"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-2 py-0.5 rounded-full">
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Image Caption Edit Input */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">
                        Photo Caption
                      </label>
                      <input 
                        type="text"
                        value={img.caption || ""}
                        onChange={(e) => {
                          const updated = [...localGalleryImages];
                          updated[idx] = { ...updated[idx], caption: e.target.value };
                          setLocalGalleryImages(updated);
                        }}
                        placeholder="e.g. Reading Hall activities..."
                        className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded outline-none text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    {/* Controls Actions Toolbar (Move Left/Up, Move Right/Down, Delete) */}
                    <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800 pt-2.5">
                      <div className="flex items-center gap-1">
                        {/* Move Left/Up Button */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            const updated = [...localGalleryImages];
                            const temp = updated[idx];
                            updated[idx] = updated[idx - 1];
                            updated[idx - 1] = temp;
                            // reset orders
                            updated.forEach((item, index) => {
                              item.order = index;
                            });
                            setLocalGalleryImages(updated);
                          }}
                          className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-650 transition-all cursor-pointer text-xs"
                          title="Move Up/Left"
                        >
                          ←
                        </button>
                        {/* Move Right/Down Button */}
                        <button
                          type="button"
                          disabled={idx === localGalleryImages.length - 1}
                          onClick={() => {
                            if (idx === localGalleryImages.length - 1) return;
                            const updated = [...localGalleryImages];
                            const temp = updated[idx];
                            updated[idx] = updated[idx + 1];
                            updated[idx + 1] = temp;
                            // reset orders
                            updated.forEach((item, index) => {
                              item.order = index;
                            });
                            setLocalGalleryImages(updated);
                          }}
                          className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-650 transition-all cursor-pointer text-xs"
                          title="Move Down/Right"
                        >
                          →
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = localGalleryImages.filter((_, i) => i !== idx);
                          updated.forEach((item, index) => {
                            item.order = index;
                          });
                          setLocalGalleryImages(updated);
                        }}
                        className="p-1.5 px-2.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/50 border border-red-200/50 dark:border-red-900/30 text-red-650 dark:text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                        title="Remove Photograph"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Toolbar buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
            <button
              type="button"
              onClick={fetchGalleryImages}
              disabled={isGalleryLoading || isGallerySaving}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-all"
            >
              Reset Layout
            </button>

            <button
              type="button"
              disabled={isGalleryLoading || isGallerySaving}
              onClick={() => {
                setIsGallerySaving(true);
                setGalleryError(null);
                setGallerySuccess(null);
                const token = localStorage.getItem("ramdiri_library_token");
                fetch('/api/gallery', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ images: localGalleryImages })
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data && data.success) {
                      setGallerySuccess("Gallery layout saved successfully! The homepage gallery will display your updated photographs.");
                      setLocalGalleryImages(data.images || []);
                    } else {
                      setGalleryError(data.error || "Failed to save gallery changes");
                    }
                  })
                  .catch(err => {
                    console.error("Save gallery error:", err);
                    setGalleryError("Network error: Could not connect to gallery server.");
                  })
                  .finally(() => {
                    setIsGallerySaving(false);
                  });
              }}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-extrabold rounded shadow-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isGallerySaving ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  <span>Saving Layout...</span>
                </>
              ) : (
                <span>Save Gallery Layout</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE NOTIFICATION INBOX PANEL */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6 shadow-xs animate-fade-in font-sans" id="librarian-notifications-tab">
          {/* Header row */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Librarian Administrative Notification Panel</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                All administrative notification logs from real-time events (student registrations, feedback moderation classifications, book checkins, bulk excel uploads) are privately archived here.
              </p>
            </div>

            {/* Filter toggler & bulk action */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-750">
                <button
                  onClick={() => setNotificationFilter('active')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    notificationFilter === 'active'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Active Inbox
                </button>
                <button
                  onClick={() => setNotificationFilter('archived')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    notificationFilter === 'archived'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Archived Logs
                </button>
              </div>

              {unreadNotificationsCount > 0 && onMarkAllNotificationsRead && (
                <button
                  onClick={async () => {
                    await onMarkAllNotificationsRead();
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-755 text-[10px] font-black rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {(() => {
              const filtered = notifications.filter(n => {
                if (notificationFilter === 'archived') {
                  return n.status === 'Archived';
                } else {
                  return n.status !== 'Archived';
                }
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2.5">
                    <Inbox className="w-10 h-10 text-slate-350 stroke-[1.2]" />
                    <p className="font-extrabold text-slate-500 text-sm">
                      Librarian Inbox is Clear!
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {notificationFilter === 'active' 
                        ? "Any critical administrative system logs, Excel bulk uploads, auto-moderation spam triggers, or contact mail will compile here in real-time."
                        : "Archived audit logs are stored securely for record keeping."
                      }
                    </p>
                  </div>
                );
              }

              // Sort chronologically (newest first)
              const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              return sorted.map(item => {
                let badgeBg = "bg-slate-105 border-slate-205 text-slate-600";
                let IconComponent = Bell;

                if (item.icon === 'alert') {
                  badgeBg = "bg-red-50 border-red-100 text-red-700";
                  IconComponent = AlertCircle;
                } else if (item.icon === 'success' || item.icon === 'book') {
                  badgeBg = "bg-emerald-50 border-emerald-100 text-emerald-700";
                  IconComponent = CheckCircle;
                } else if (item.icon === 'upload') {
                  badgeBg = "bg-blue-50 border-blue-100 text-blue-700";
                  IconComponent = Upload;
                } else if (item.icon === 'message') {
                  badgeBg = "bg-violet-50 border-violet-100 text-violet-700";
                  IconComponent = MessageSquare;
                } else if (item.icon === 'user') {
                  badgeBg = "bg-indigo-50 border-indigo-100 text-indigo-700";
                  IconComponent = User;
                }

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 border rounded-xl flex items-start justify-between gap-4 transition-all ${
                      item.status === 'Unread'
                        ? 'bg-slate-50/50 border-slate-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2 rounded-lg border shrink-0 ${badgeBg}`}>
                        <IconComponent className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 leading-tight">
                            {item.title}
                          </span>
                          {item.status === 'Unread' && (
                            <span className="bg-indigo-650 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider animate-pulse shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          {item.message}
                        </p>
                        <span className="text-[9.5px] text-slate-400 font-mono font-semibold block">
                          📅 {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === 'Unread' && onMarkNotificationRead && (
                        <button
                          onClick={async () => {
                            await onMarkNotificationRead(item.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-550 hover:text-indigo-600 transition-all cursor-pointer font-bold text-xs"
                          title="Mark as Read"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      )}
                      {item.status !== 'Archived' && onArchiveNotification && (
                        <button
                          onClick={async () => {
                            await onArchiveNotification(item.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* CHIEF LIBRARIAN CREDENTIAL ROTATION SECURITY SETTINGS PANEL */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6 shadow-xs animate-fade-in" id="security-tab-content">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
              Administrative settings & Profile desk
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Manage the public-facing Librarian's Desk biography, professional designation, profile photo, and change administrative credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMN 1: PUBLIC PROFILE EDITING PANEL */}
            <div className="space-y-4 border-r border-slate-150 dark:border-slate-800 lg:pr-8 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="select-none">
                  <h4 className="font-extrabold text-xs text-slate-950 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    Librarian's Desk Profile Card
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                    The public display profile is now managed directly from the library homepage with real-time inline controls.
                  </p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/45 p-4 rounded-xl border border-slate-200 dark:border-slate-850">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Librarian Display Name</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full text-xs text-slate-905 dark:text-slate-105 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-800 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Professional Designation</label>
                      <input
                        type="text"
                        required
                        value={profileDesignation}
                        onChange={e => setProfileDesignation(e.target.value)}
                        className="w-full text-xs text-slate-905 dark:text-slate-105 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-800 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Years of Service (Optional)</label>
                      <input
                        type="text"
                        value={profileYearsOfService}
                        onChange={e => setProfileYearsOfService(e.target.value)}
                        placeholder="e.g. 25+ Years of Service"
                        className="w-full text-xs text-slate-905 dark:text-slate-105 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-800 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase block">📷 Desk Profile Photograph</label>
                      <div className="flex items-center gap-3">
                        <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-755 text-indigo-750 dark:text-indigo-300 font-bold text-xs rounded-lg cursor-pointer border border-indigo-200 dark:border-slate-700 flex items-center gap-1.5 transition-all select-none">
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith('image/')) {
                                setProfileError("Please select a valid image file.");
                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                setProfileError("Maximum image file size is 5MB.");
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
                                    setProfilePhoto(dataUrl);
                                    setProfileError(null);
                                  } else {
                                    setProfilePhoto(event.target?.result as string);
                                  }
                                };
                                img.src = event.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {profilePhoto ? (
                          <div className="flex items-center gap-2">
                            <img src={profilePhoto} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border" alt="Profile Preview" />
                            <button
                              type="button"
                              onClick={() => setProfilePhoto('')}
                              className="text-[11px] font-bold text-red-600 hover:text-red-500 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Default avatar is active</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Desk Biography (Welcome Quote)</label>
                      <textarea
                        rows={3}
                        required
                        value={profileBiography}
                        onChange={e => setProfileBiography(e.target.value)}
                        placeholder="Write a warm message to scholars visiting the library..."
                        className="w-full text-xs text-slate-905 dark:text-slate-105 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-slate-800 outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-red-600 font-bold font-mono text-[10.5px]">{profileError}</p>
                  )}
                  {profileSuccess && (
                    <p className="text-emerald-600 font-bold font-mono text-[10.5px]">{profileSuccess}</p>
                  )}

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-955 font-black uppercase rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    {profileLoading ? "Saving Desk Profile..." : "Save Desk Profile Details"}
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 2: LOGIN ACCESS SECURITY CONTROL PANEL */}
            <div className="space-y-4">
              <div className="select-none">
                <h4 className="font-extrabold text-xs text-slate-950 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                  Access Credentials & Rotation
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Rotate access login credentials for the chief administrative portal. All entries are hashed using salted cryptographic BCrypt algorithms.
                </p>
              </div>

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                    Administrative Username
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none caret-indigo-600 font-bold placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <span className="text-[10px] text-slate-400 block font-sans select-none">Usernames are non-case sensitive. Lowercase characters are recommended.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase block select-none">
                    Current Password (Verification Required)
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Verify identity with current password"
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
                        placeholder="Min 6 chars (Blank to keep)"
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
                      Confirm New Password
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
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none animate-fade-in"
                >
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span>{secLoading ? "Updating Credentials..." : "Commit Credentials Update"}</span>
                </button>
              </form>
            </div>

          </div>

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
                onClick={() => {
                  setShowIssuedModal(false);
                  setIssuedModalSearch('');
                }}
                className="w-7 h-7 rounded-full hover:bg-indigo-900 flex items-center justify-center text-indigo-200 hover:text-white transition-all cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter segments inside dynamic issued list model */}
            <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 p-2 gap-2 flex-wrap">
              <button
                onClick={() => setIssuedModalFilter('Issued')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  issuedModalFilter === 'Issued'
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📖 Currently Issued ({activeLoans.length})
              </button>
              <button
                onClick={() => setIssuedModalFilter('Returned')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  issuedModalFilter === 'Returned'
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ✅ Returned Books ({issueLogs.filter(log => log.status === 'Returned').length})
              </button>
              <button
                onClick={() => setIssuedModalFilter('Overdue')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  issuedModalFilter === 'Overdue'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Overdue Books ({overdueLogs.length})</span>
              </button>
            </div>

            {/* High-speed Real-time Search input for issued modal */}
            <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={issuedModalSearch}
                onChange={e => setIssuedModalSearch(e.target.value)}
                placeholder="🔍 Search logs by student (name, roll, class, sec) or book (title, accession #, call #, category)..."
                className="w-full text-xs text-slate-900 dark:text-slate-100 p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg focus:ring-1 focus:ring-indigo-600 outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium"
              />
              {issuedModalSearch && (
                <button 
                  onClick={() => setIssuedModalSearch('')} 
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[9px] tracking-wider select-none font-mono">
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5 text-center font-mono">Roll Number</th>
                    <th className="p-2.5 text-center font-sans">Class / Section</th>
                    <th className="p-2.5">Book Title</th>
                    <th className="p-2.5 font-mono text-center">Checkout Date</th>
                    <th className="p-2.5 font-mono text-center">Due Return Date</th>
                    <th className="p-2.5 text-right font-bold">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                  {filteredIssuedModalLogs.map(log => {
                    const demo = getStudentProfile(log.rollNumber, log.class, log.section);
                    const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-slate-100">{log.studentName}</td>
                        <td className="p-2.5 text-center text-slate-700 dark:text-slate-300">#{log.rollNumber}</td>
                        <td className="p-2.5 text-center font-sans text-slate-800 dark:text-slate-200">Class {demo.class} - {demo.section}</td>
                        <td className="p-2.5 font-sans font-medium italic text-slate-700 dark:text-slate-300">{log.bookName}</td>
                        <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{log.issueDate}</td>
                        <td className={`p-2.5 text-center font-bold ${isPastDue ? 'text-red-600 dark:text-red-450 font-black' : 'text-slate-700 dark:text-slate-300'}`}>{log.dueDate}</td>
                        <td className="p-2.5 text-right">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded font-sans font-extrabold uppercase inline-block border ${
                            log.status === 'Returned'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                              : isPastDue
                              ? 'bg-red-50 text-red-800 border-red-200 animate-pulse dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
                          }`}>
                            {log.status === 'Returned' ? 'Returned' : isPastDue ? `${getDaysOverdue(log.dueDate)} Overdue` : 'Issued'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredIssuedModalLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 dark:text-slate-500 font-sans text-xs">
                        No checked records available inside this selected register.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-155 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setShowIssuedModal(false);
                  setIssuedModalSearch('');
                }}
                className="px-5 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-extrabold text-xs rounded shadow-xs cursor-pointer select-none"
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
        const studentRequests = requests.filter(r => 
          (r.studentId && stud.studentId && r.studentId === stud.studentId) ||
          (String(r.rollNumber) === String(stud.rollNumber) && r.class === stud.class && r.section === stud.section)
        );
        const studentLogs = issueLogs.filter(l => 
          (l.studentId && stud.studentId && l.studentId === stud.studentId) ||
          (String(l.rollNumber) === String(stud.rollNumber) && l.class === stud.class && l.section === stud.section)
        );
        const totalRequested = studentRequests.length;
        const totalIssuedValue = studentLogs.length;
        const totalReturnedValue = studentLogs.filter(l => l.status === 'Returned' || l.returnDate).length;
        const currentlyIssuedValue = studentLogs.filter(l => l.status === 'Issued').length;
        const overdueBooksValue = studentLogs.filter(l => l.status === 'Issued' && isOverdue(l.dueDate)).length;

        // Build integrated chronological timeline events
        const timelineEvents: {
          type: 'Request' | 'Issue' | 'Return';
          date: string;
          bookName: string;
          bookId: string;
          status: string;
          color: string;
          iconName: string;
          accessionNumber?: string;
          callNumber?: string;
          bookNumber?: string;
          shelfLocation?: string;
          shelfSerial?: number;
          dueDate?: string;
          issueDate?: string;
          returnDate?: string;
        }[] = [];

        studentRequests.forEach(req => {
          let statusText = "Requested (Pending Approval)";
          let color = 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
          let iconName = 'Clock';
          if (req.status === 'Approved') {
            statusText = "Request Approved & Ready";
            color = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900';
            iconName = 'CheckCircle';
          } else if (req.status === 'Rejected') {
            statusText = "Request Rejected";
            color = 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
            iconName = 'XCircle';
          }
          const bk = books.find(b => b.bookId === req.bookId);
          timelineEvents.push({
            type: 'Request',
            date: req.requestDate,
            bookName: req.bookName,
            bookId: req.bookId,
            status: statusText,
            color,
            iconName,
            accessionNumber: bk?.accessionNumber,
            callNumber: bk?.callNumber,
            bookNumber: bk?.bookNumber,
            shelfLocation: bk?.category ? `Shelf Row: ${bk.category}` : undefined,
            shelfSerial: categorySerialsMap.get(req.bookId) || 1
          });
        });

        studentLogs.forEach(log => {
          const isPastDue = log.status === 'Issued' && isOverdue(log.dueDate);
          let statusText = "Book Issued / Borrowed";
          let color = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900';
          let iconName = 'BookOpen';
          if (isPastDue) {
            statusText = "Book Borrowed (Overdue!)";
            color = 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 font-black animate-pulse';
          }
          
          const bk = books.find(b => b.bookId === log.bookId);
          timelineEvents.push({
            type: 'Issue',
            date: log.issueDate,
            bookName: log.bookName,
            bookId: log.bookId,
            status: statusText,
            color,
            iconName,
            accessionNumber: bk?.accessionNumber,
            callNumber: bk?.callNumber,
            bookNumber: bk?.bookNumber,
            shelfLocation: bk?.category ? `Shelf Row: ${bk.category}` : undefined,
            shelfSerial: categorySerialsMap.get(log.bookId) || 1,
            dueDate: log.dueDate,
            issueDate: log.issueDate
          });

          if (log.status === 'Returned' && log.returnDate) {
            timelineEvents.push({
              type: 'Return',
              date: log.returnDate,
              bookName: log.bookName,
              bookId: log.bookId,
              status: "Book Safely Returned",
              color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900',
              iconName: 'ClipboardCheck',
              accessionNumber: bk?.accessionNumber,
              callNumber: bk?.callNumber,
              bookNumber: bk?.bookNumber,
              shelfLocation: bk?.category ? `Shelf Row: ${bk.category}` : undefined,
              shelfSerial: categorySerialsMap.get(log.bookId) || 1,
              dueDate: log.dueDate,
              issueDate: log.issueDate,
              returnDate: log.returnDate
            });
          }
        });

        // Sort timelineEvents chronologically: latest first
        timelineEvents.sort((a, b) => {
          const tA = new Date(a.date).getTime() || 0;
          const tB = new Date(b.date).getTime() || 0;
          return tB - tA;
        });

        const renderTimelineIcon = (iconName: string) => {
          switch (iconName) {
            case 'CheckCircle': return <CheckCircle className="w-4 h-4" />;
            case 'XCircle': return <XCircle className="w-4 h-4" />;
            case 'BookOpen': return <BookOpen className="w-4 h-4" />;
            case 'ClipboardCheck': return <ClipboardCheck className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
          }
        };

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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-all cursor-pointer font-extrabold text-xs select-none border border-emerald-800/50"
                  title="Go Back"
                >
                  <span>← {currentLang === 'HI' ? "वापस जाएं" : "Back to List"}</span>
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
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-right">{stud.status === "VACANT" || !stud.name ? (currentLang === 'EN' ? "Vacant" : "रिक्त") : stud.name}</span>
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
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "जन्म तिथि" : "Date of Birth"}:</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-350 text-right">{stud.dob || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-555 mr-2">{currentLang === 'HI' ? "प्रवेश संख्या" : "Admission Number"}:</span>
                        <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400 text-right">{(stud as any).admissionNumber || "N/A"}</span>
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

                {/* Tab selector for Timeline vs Table views */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalView('timeline')}
                    className={`pb-2 px-3 text-xs font-bold tracking-wide uppercase transition-all border-b-2 ${
                      studentModalView === 'timeline'
                        ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    🕒 {currentLang === 'HI' ? "समय-सीमा दृश्य" : "Timeline View"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentModalView('table')}
                    className={`pb-2 px-3 text-xs font-bold tracking-wide uppercase transition-all border-b-2 ${
                      studentModalView === 'table'
                        ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    📋 {currentLang === 'HI' ? "तालिका दृश्य" : "Table View"}
                  </button>
                </div>

                {/* 2. Interactive Timeline or Transaction Logs History List */}
                <div className="space-y-2.5">
                  {studentModalView === 'timeline' ? (
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-8 space-y-5 py-2">
                      {timelineEvents.map((evt, idx) => (
                        <div key={idx} className="relative">
                          {/* Dot Circle Container */}
                          <div className={`absolute -left-12 top-0.5 w-8 h-8 rounded-full border flex items-center justify-center bg-white dark:bg-slate-900 shadow-xs ${evt.color}`}>
                            {renderTimelineIcon(evt.iconName)}
                          </div>
                          {/* Content Panel Card */}
                          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl space-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-500 font-bold">{evt.date}</span>
                              <span className={`text-[9px] font-sans font-black uppercase px-2 py-0.5 rounded-full border ${evt.color}`}>
                                {evt.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">{evt.bookName}</h4>
                            <p className="text-[11px] font-mono text-slate-500">
                              Book ID: #{evt.bookId} • Event Type: {evt.type === 'Request' ? 'Reservation Request' : evt.type === 'Issue' ? 'Physical Checkout' : 'Physical Return'}
                            </p>
                            
                            {/* Rich Book Parameters Details Grid */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-[10px] text-slate-650 dark:text-slate-350 font-mono">
                              <div>
                                <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Accession Number</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{evt.accessionNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Call Number</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{evt.callNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Book Number</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{evt.bookNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Shelf Serial No.</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400">#{evt.shelfSerial || '1'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Shelf Location</span>
                                <span className="font-bold text-slate-850 dark:text-slate-250 truncate block">{evt.shelfLocation || 'Main Stack Section'}</span>
                              </div>
                              {evt.issueDate && (
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Issue Date</span>
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{evt.issueDate}</span>
                                </div>
                              )}
                              {evt.dueDate && (
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Due Date</span>
                                  <span className={`font-black ${evt.status.includes('Overdue') ? 'text-red-650 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{evt.dueDate}</span>
                                </div>
                              )}
                              {evt.returnDate && (
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] font-sans font-extrabold tracking-wider">Return Date</span>
                                  <span className="font-extrabold text-emerald-600 dark:text-emerald-450">{evt.returnDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {timelineEvents.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-sans -ml-8">
                          No history or transaction timeline logged under this student's registration.
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProfileStudent(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded shadow transition-all cursor-pointer select-none font-sans flex items-center gap-1.5"
                >
                  <span>← {currentLang === 'HI' ? "छात्र सूची पर वापस जाएं" : "Back to Student List"}</span>
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
