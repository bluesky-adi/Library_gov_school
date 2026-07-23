/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Printer, FileText, Download, CheckCircle, Clock } from 'lucide-react';
import { Book, Student, BorrowRequest, BookIssueLog } from '../types';
import { buildCategorySerialsMap, getDisplayShelfNumber } from '../lib/shelfUtils';

interface ReportsModuleProps {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  currentLang: 'EN' | 'HI';
}

export default function ReportsModule({
  books,
  students,
  requests,
  issueLogs,
  currentLang
}: ReportsModuleProps) {
  const [activeReport, setActiveReport] = useState<'inventory' | 'loans' | 'students'>('inventory');

  // Dynamic Category Serial Numbering Map for shelf tracking
  const categorySerialsMap = useMemo(() => {
    return buildCategorySerialsMap(books);
  }, [books]);

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const idA = parseInt(a.bookId.replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(b.bookId.replace(/\D/g, ''), 10) || 0;
      if (idA !== idB) return idA - idB;
      return a.bookId.localeCompare(b.bookId, undefined, { numeric: true });
    });
  }, [books]);

  const t = {
    EN: {
      reportsTitle: "State Printable Audit Office Reports",
      optInventory: "Catalog Inventory Register",
      optIssued: "Active Loans Registrar",
      optStudent: "Student Reader Directory",
      printAction: "Print Record Sheet (PDF)",
      exportAction: "Download CSV Matrix",
      totalSum: "Gross Registered Stock:",
      availableSum: "Available Shelf Stock:",
      issuedSum: "Active Out-on-Loan Count:",
      academicCount: "Academic Reference Syllabus:"
    },
    HI: {
      reportsTitle: "राजकीय मुद्रण योग्य प्रशासनिक रिपोर्टें",
      optInventory: "कैटलॉग इन्वेंटरी रजिस्टर",
      optIssued: "सक्रिय लोन बहीखाता (सर्कुलेशन)",
      optStudent: "छात्र पाठक निर्देशिका",
      printAction: "रिपोर्ट प्रिंट करें (PDF)",
      exportAction: "सीएसवी प्राप्त करें",
      totalSum: "कुल पंजीकृत स्टॉक संख्या:",
      availableSum: "शेल्फ पर उपलब्ध संख्या:",
      issuedSum: "सक्रिय रूप से जारी संख्या:",
      academicCount: "शैक्षणिक सन्दर्भ सामग्री:"
    }
  }[currentLang];

  const handlePrint = () => {
    window.print();
  };

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReport === 'inventory') {
      csvContent += "Book ID,Title,Author,Publisher,Category,Total Copies,Available Copies\n";
      sortedBooks.forEach(b => {
        csvContent += `"${b.bookId}","${b.bookName}","${b.author}","${b.publisher}","${b.category}",${b.totalCopies},${b.availableCopies}\n`;
      });
    } else if (activeReport === 'loans') {
      csvContent += "Transaction ID,Student Name,Roll Number,Book Title,Issued Date,Status\n";
      issueLogs.forEach(l => {
        csvContent += `"${l.id}","${l.studentName}",${l.rollNumber},"${l.bookName}","${l.issueDate}","${l.status}"\n`;
      });
    } else {
      csvContent += "Student Name,Roll Number,Date of Birth\n";
      students.forEach(s => {
        csvContent += `"${s.name}",${s.rollNumber},"${s.dob}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `ramdiri_${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Highlight parameters computations
  const totalVolume = books.reduce((sum, b) => sum + b.totalCopies, 0);
  const shelvingCount = books.reduce((sum, b) => sum + b.availableCopies, 0);
  const outstandingLoans = totalVolume - shelvingCount;
  const academicBooks = books.filter(b => b.category === 'Academic').length;

  return (
    <div className="space-y-6" id="reports-module-root">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div className="space-y-1">
          <span className="text-[10px] bg-emerald-100 text-emerald-805 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none text-emerald-850">
            Government of Bihar - BSEB secondary Board
          </span>
          <h2 className="text-base font-extrabold text-slate-905 dark:text-slate-100 uppercase tracking-tight">
            {t.reportsTitle}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-850 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printAction}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>{t.exportAction}</span>
          </button>
        </div>
      </div>

      {/* 2. Quick stats panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 select-none">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">{t.totalSum}</span>
          <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono block">{totalVolume}</span>
          <span className="text-[10px] text-slate-500 block">Total individual copies registered</span>
        </div>

        <div className="p-4 bg-emerald-50/40 dark:bg-slate-950 border border-emerald-100 dark:border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider block">{t.availableSum}</span>
          <span className="text-xl font-black text-emerald-900 dark:text-emerald-400 font-mono block">{shelvingCount}</span>
          <span className="text-[10px] text-slate-500 block">Safe copies ready for immediate checkout</span>
        </div>

        <div className="p-4 bg-orange-50/40 dark:bg-slate-950 border border-orange-100 dark:border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-orange-850 uppercase font-black tracking-wider block">{t.issuedSum}</span>
          <span className="text-xl font-black text-orange-800 dark:text-orange-400 font-mono block">{outstandingLoans}</span>
          <span className="text-[10px] text-slate-500 block">Current outstanding loans</span>
        </div>

        <div className="p-4 bg-sky-50 Im/35 bg-sky-50/30 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-sky-850 uppercase font-black tracking-wider block">{t.academicCount}</span>
          <span className="text-xl font-black text-sky-800 dark:text-sky-400 font-mono block">{academicBooks} titles</span>
          <span className="text-[10px] text-slate-500 block">Aligned with class 6-12 board exams</span>
        </div>
      </div>

      {/* 3. Report selector tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-xs print:hidden">
        {[
          { id: 'inventory', label: t.optInventory },
          { id: 'loans', label: t.optIssued },
          { id: 'students', label: t.optStudent }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReport === tab.id
                ? 'bg-[#0d4f30] text-white font-black'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Table view layout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden" id="printable-administrative-roster">
        
        {/* Printable Title Header Block (Visually hidden on screen, clean on Print) */}
        <div className="hidden print:block p-6 text-center border-b border-double border-slate-800 text-slate-950 font-sans space-y-1 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-widest block">ADMINISTRATIVE BOARD STATEMENT FOR BIHAR GOVT SCHOOL PORTALS</span>
          <h1 className="text-lg font-black uppercase text-[#0d3f26]">{t.reportsTitle}</h1>
          <p className="text-xs font-serif italic">Ramdiri +2 High School, Begusarai, Bihar • ESTD. 1952</p>
          <div className="text-[10px] pt-1.5 flex justify-around border-t mt-3.5">
            <span>Date Generated: {new Date().toLocaleDateString()}</span>
            <span>Institution Code: BSEB-BEG-52031</span>
            <span>Register Type: {activeReport.toUpperCase()} RESOURCE STATEMENT</span>
          </div>
        </div>

        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-extrabold text-xs flex justify-between select-none">
          <span className="uppercase text-slate-705 dark:text-slate-200 font-bold">{activeReport === 'inventory' ? t.optInventory : activeReport === 'loans' ? t.optIssued : t.optStudent}</span>
          <span className="font-mono text-[11px] text-slate-500 italic">Record Count: {activeReport === 'inventory' ? books.length : activeReport === 'loans' ? issueLogs.length : students.length} items</span>
        </div>

        <div className="overflow-x-auto">
          
          {activeReport === 'inventory' && (
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 hover:text-slate-950 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none">
                  <th className="p-3">Reference ID</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400 font-bold font-mono">Shelf Sr #</th>
                  <th className="p-3">Book Title</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Publisher</th>
                  <th className="p-3">Subject Category</th>
                  <th className="p-3 text-center">Total Registered</th>
                  <th className="p-3 text-center">Available on Shelf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {sortedBooks.map(b => (
                  <tr key={b.bookId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-emerald-800">{b.bookId}</td>
                    <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20">{getDisplayShelfNumber(b, categorySerialsMap, { prefix: "Shelf #" })}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{b.bookName}</td>
                    <td className="p-3 text-slate-705 dark:text-slate-300">{b.author}</td>
                    <td className="p-3 text-slate-500">{b.publisher}</td>
                    <td className="p-3 font-semibold text-sky-850 dark:text-sky-450">{b.category}</td>
                    <td className="p-3 text-center font-mono font-semibold">{b.totalCopies}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">{b.availableCopies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'loans' && (
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                  <th className="p-3">Loan Log ID</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400 font-bold font-mono">Shelf Number</th>
                  <th className="p-3">Book Checked-Out</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">Roll Number</th>
                  <th className="p-3">Date of Issue</th>
                  <th className="p-3 text-center">Return Date</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {issueLogs.map(l => {
                  const bookObj = books.find(b => b.bookId === l.bookId || b.bookName === l.bookName);
                  const shelfVal = getDisplayShelfNumber(bookObj, categorySerialsMap, { prefix: "Shelf #" });
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-500">{l.id}</td>
                      <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20">{shelfVal}</td>
                      <td className="p-3 font-bold text-slate-905 dark:text-slate-105">{l.bookName}</td>
                      <td className="p-3 font-semibold text-slate-808 dark:text-slate-305">{l.studentName}</td>
                      <td className="p-3 text-center font-mono font-bold text-teal-800">Roll #{l.rollNumber}</td>
                      <td className="p-3 font-mono">{l.issueDate}</td>
                      <td className="p-3 text-center font-mono text-slate-500">{l.returnDate || "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black inline-flex items-center gap-1 leading-none ${
                          l.status === 'Issued'
                            ? 'bg-orange-100 text-orange-950 border border-orange-200 animate-pulse'
                            : 'bg-emerald-100 text-emerald-950'
                        }`}>
                          {l.status === 'Issued' ? <Clock className="w-2.5 h-2.5 shrink-0" /> : <CheckCircle className="w-2.5 h-2.5 shrink-0" />}
                          <span>{l.status === 'Issued' ? (currentLang === 'EN' ? "Outstanding" : "सक्रिय लोन") : (currentLang === 'EN' ? "Completed" : "जमा हो चुकी")}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {issueLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-450 italic">
                      {currentLang === 'EN' ? "No lending transactions logged yet." : "अभी तक कोई सक्रिय लोन लेनदेन दर्ज नहीं किया गया है।"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === 'students' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                  <th className="p-3">Roll number Index</th>
                  <th className="p-3">Pupil Name</th>
                  <th className="p-3 text-right">Date of Birth (DOB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {students.map(s => (
                  <tr key={s.rollNumber} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-emerald-800">Roll Index #{s.rollNumber}</td>
                    <td className="p-3 font-bold text-slate-905 dark:text-slate-105">{s.name}</td>
                    <td className="p-3 text-right font-mono text-slate-505">{s.dob}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>

        {/* Printable Footer signature block (Visually hidden on screen, clean on Print) */}
        <div className="hidden print:flex justify-between items-center mt-20 p-6 pt-12 border-t border-slate-200 text-[#0d3f26] font-sans text-xs bg-white">
          <div className="text-center space-y-10">
            <div className="w-36 border-b border-slate-400"></div>
            <p className="font-bold uppercase text-[10px]">Headmaster's Signature / Stamp</p>
          </div>
          <div className="text-center space-y-10">
            <div className="w-36 border-b border-slate-400"></div>
            <p className="font-bold uppercase text-[10px]">Librarian's Signature</p>
          </div>
        </div>

      </div>

    </div>
  );
}
