/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, AlertTriangle, Download, ArrowRight, Sparkles, Users } from 'lucide-react';
import { Book, Student } from '../types';

interface ExcelModuleProps {
  onImportBooks: (importedBooks: Book[]) => void;
  onImportStudents: (importedStudents: Student[]) => void;
  currentLang: 'EN' | 'HI';
}

export default function ExcelModule({ onImportBooks, onImportStudents, currentLang }: ExcelModuleProps) {
  const [activePreset, setActivePreset] = useState<'books' | 'students'>('books');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booksParsed, setBooksParsed] = useState<Book[]>([]);
  const [studentsParsed, setStudentsParsed] = useState<Student[]>([]);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    EN: {
      zoneHelpBooks: "Drag & drop your books.xlsx file here, or click to upload",
      zoneHelpStudents: "Drag & drop your students.xlsx file here, or click to upload",
      columnsBooks: "Columns required: Book Name, Author, Publisher, Category, Description, Copies",
      columnsStudents: "Columns required: Name, Roll Number, DOB, Class, Section",
      loadSampleBooks: "Load Sample books.xlsx",
      loadSampleStudents: "Load Sample students.xlsx",
      parseSuccess: "Spreadsheet parsed successfully!",
      validationPassed: "All validation constraints passed! Ready to bulk commit.",
      commitBooks: "Save Books to Inventory",
      commitStudents: "Save Students Data Roster",
      invalidHeaders: "Missing required columns in spreadsheet. Please verify headers.",
      noRows: "No data rows found in the uploaded sheet."
    },
    HI: {
      zoneHelpBooks: "अपनी books.xlsx फ़ाइल को यहाँ ड्रैग और ड्रॉप करें, या अपलोड करने के लिए क्लिक करें",
      zoneHelpStudents: "अपनी students.xlsx फ़ाइल को यहाँ ड्रैग और ड्रॉप करें, या अपलोड करने के लिए क्लिक करें",
      columnsBooks: "आवश्यक कॉलम: Book Name, Author, Publisher, Category, Description, Copies",
      columnsStudents: "आवश्यक कॉलम: Name, Roll Number, DOB, Class, Section",
      loadSampleBooks: "नमूना books.xlsx डेटा लोड करें",
      loadSampleStudents: "नमूना students.xlsx डेटा लोड करें",
      parseSuccess: "स्प्रेडशीट का सफलतापूर्वक विश्लेषण किया गया!",
      validationPassed: "सभी सत्यापन मानदंड पारित! भंडारण के लिए तैयार।",
      commitBooks: "पुस्तकों को स्कूल इन्वेंटरी में सहेजें",
      commitStudents: "छात्रों को डेटाबेस में सहेजें",
      invalidHeaders: "स्प्रेडशीट में आवश्यक कॉलम गायब हैं। कृपया हेडर सत्यापित करें।",
      noRows: "अपलोड की गई शीट में कोई डेटा पंक्तियाँ नहीं मिलीं।"
    }
  }[currentLang];

  const validateBookHeaders = (headers: string[]): boolean => {
    const required = ["Book Name", "Author", "Publisher", "Category", "Description", "Copies"];
    return required.every(field => headers.some(h => h.trim().toLowerCase() === field.toLowerCase()));
  };

  const validateStudentHeaders = (headers: string[]): boolean => {
    const required = ["Name", "Roll Number", "DOB", "Class", "Section"];
    return required.every(field => headers.some(h => h.trim().toLowerCase() === field.toLowerCase()));
  };

  const processFileContents = (sheetData: any[]) => {
    if (sheetData.length === 0) {
      setErrorMessage(t.noRows);
      setIsValidated(false);
      return;
    }

    const headers = Object.keys(sheetData[0]);
    const validationLogs: string[] = [];

    if (activePreset === 'books') {
      if (!validateBookHeaders(headers)) {
        setErrorMessage(t.invalidHeaders + " " + t.columnsBooks);
        setBooksParsed([]);
        setIsValidated(false);
        return;
      }

      const booksList: Book[] = sheetData.map((row, index) => {
        const bookName = row["Book Name"] || row["book name"] || "Untitled Book";
        const author = row["Author"] || row["author"] || "Unknown Author";
        const publisher = row["Publisher"] || row["publisher"] || "Unknown Publisher";
        const category = row["Category"] || row["category"] || "Academic";
        const description = row["Description"] || row["description"] || "Syllabus Resource";
        const copies = parseInt(row["Copies"] || row["copies"] || "5") || 5;
        const bookId = `BK-EX-${Date.now().toString().slice(-4)}-${index + 1}`;

        validationLogs.push(`Validated Row ${index + 2}: '${bookName}' by ${author} (${copies} copies)`);

        return {
          bookId,
          bookName,
          author,
          publisher,
          category,
          description,
          totalCopies: copies,
          availableCopies: copies
        };
      });

      setErrorMessage(null);
      setBooksParsed(booksList);
      setStudentsParsed([]);
      setIsValidated(true);
      setLogs(validationLogs);

    } else {
      if (!validateStudentHeaders(headers)) {
        setErrorMessage(t.invalidHeaders + " " + t.columnsStudents);
        setStudentsParsed([]);
        setIsValidated(false);
        return;
      }

      const studentsList: Student[] = sheetData.map((row, index) => {
        const name = row["Name"] || row["name"] || "Unknown Student";
        const rollNumber = parseInt(row["Roll Number"] || row["roll number"] || "0") || (index + 1);
        const dobRaw = row["DOB"] || row["dob"] || "2010-01-01";
        const studClass = (row["Class"] || row["class"] || "10").toString().trim();
        const section = (row["Section"] || row["section"] || "A").toString().trim();
        
        let dob = "2010-01-01";
        if (dobRaw) {
          if (typeof dobRaw === 'number' && dobRaw > 1000) {
            // Excel serial date representation
            try {
              const dateObj = XLSX.SSF.parse_date_code(dobRaw);
              const m = dateObj.m < 10 ? '0' + dateObj.m : dateObj.m;
              const d = dateObj.d < 10 ? '0' + dateObj.d : dateObj.d;
              dob = `${dateObj.y}-${m}-${d}`;
            } catch (err) {
              dob = "2010-01-01";
            }
          } else {
            dob = dobRaw.toString().trim();
          }
        }

        validationLogs.push(`Validated Row ${index + 2}: '${name}' | Roll No: ${rollNumber} | DOB: ${dob} | Class: ${studClass} | Section: ${section}`);

        return {
          name,
          rollNumber,
          dob,
          class: studClass,
          section
        };
      });

      setErrorMessage(null);
      setStudentsParsed(studentsList);
      setBooksParsed([]);
      setIsValidated(true);
      setLogs(validationLogs);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processFileContents(json);
      } catch (err) {
        setErrorMessage(currentLang === 'EN' ? "Failed to read excel file. Please check file structure." : "एक्सेल फ़ाइल पढ़ने में विफल। कृपया फ़ाइल की संरचना की जांच करें।");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSamplePreset = () => {
    if (activePreset === 'books') {
      const sampleBooks = [
        { "Book Name": "Vigyan Class 10 (विज्ञान)", "Author": "Bihar Secondary Board", "Publisher": "BSTBPC, Patna", "Category": "Academic", "Description": "Syllabus handbook for board class physics and chemistry.", "Copies": 15 },
        { "Book Name": "Renu Sahitya Rachna", "Author": "Phanishwar Nath Renu", "Publisher": "Rajkamal Prakashan", "Category": "Literature", "Description": "Folk tales and regional literature of rural Bihar.", "Copies": 8 },
        { "Book Name": "Mathematics Class 11", "Author": "K.C. Sinha", "Publisher": "Student Friends Publishers", "Category": "Academic", "Description": "Intense reference book with detailed quadratic exercises.", "Copies": 10 }
      ];
      processFileContents(sampleBooks);
    } else {
      const sampleStudents = [
        { "Name": "Ranjit Singh", "Roll Number": 15, "DOB": "2010-08-12", "Class": "10", "Section": "A" },
        { "Name": "Meera Chaurasia", "Roll Number": 8, "DOB": "2011-03-24", "Class": "9", "Section": "B" },
        { "Name": "Amit Kumar Paswan", "Roll Number": 21, "DOB": "2010-11-05", "Class": "10", "Section": "C" }
      ];
      processFileContents(sampleStudents);
    }
  };

  const commitParsedData = () => {
    if (activePreset === 'books' && booksParsed.length > 0) {
      onImportBooks(booksParsed);
      setBooksParsed([]);
      setIsValidated(false);
      setLogs([]);
    } else if (activePreset === 'students' && studentsParsed.length > 0) {
      onImportStudents(studentsParsed);
      setStudentsParsed([]);
      setIsValidated(false);
      setLogs([]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="excel-and-student-uploader" className="space-y-4">
      {/* Switch Upload Type */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => {
            setActivePreset('books');
            setIsValidated(false);
            setErrorMessage(null);
            setBooksParsed([]);
            setStudentsParsed([]);
          }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activePreset === 'books'
              ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          {currentLang === 'EN' ? "Upload Books" : "पुस्तकें लोड करें (books.xlsx)"}
        </button>
        <button
          onClick={() => {
            setActivePreset('students');
            setIsValidated(false);
            setErrorMessage(null);
            setBooksParsed([]);
            setStudentsParsed([]);
          }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activePreset === 'students'
              ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          {currentLang === 'EN' ? "Upload Students" : "छात्र लोड करें (students.xlsx)"}
        </button>
      </div>

      <div className="bg-emerald-50/80 dark:bg-slate-900 border-l-4 border-emerald-600 p-4 rounded-r-lg">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
          {activePreset === 'books' ? <FileText className="w-4 h-4 text-emerald-700" /> : <Users className="w-4 h-4 text-emerald-700" />}
          {activePreset === 'books' 
            ? (currentLang === 'EN' ? "XLSX Books Import Template" : "XLSX बुक्स आयात टेम्पलेट")
            : (currentLang === 'EN' ? "XLSX Students Import Template" : "XLSX छात्र सूची आयात टेम्पलेट")
          }
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-450 mt-1">
          {activePreset === 'books' ? t.columnsBooks : t.columnsStudents}
        </p>
      </div>

      {/* Upload Drag Drop Area */}
      <div 
        onClick={triggerFileSelect}
        className="border-2 border-dashed border-slate-350 dark:border-slate-800 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/30 dark:bg-slate-950 transition-all select-none"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key==='Enter'||e.key===' ') triggerFileSelect(); }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls"
          className="hidden"
          id="xlsx-generic-file-picker"
        />
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs text-center">
          {activePreset === 'books' ? t.zoneHelpBooks : t.zoneHelpStudents}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">
          {currentLang === 'EN' ? "Accepts standard .xlsx spreadsheets" : ".xlsx स्प्रेडशीट का समर्थन करता है"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={loadSamplePreset}
          className="px-3 py-1.5 border border-slate-200 text-[11px] font-bold text-slate-700 dark:text-slate-350 bg-white hover:bg-slate-50 rounded transition-all flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          {activePreset === 'books' ? t.loadSampleBooks : t.loadSampleStudents}
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-3.5 rounded-lg flex items-start gap-2 text-xs text-red-800 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Validation success summary */}
      {isValidated && (
        <div className="border border-emerald-300 bg-emerald-50/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">{t.parseSuccess}</span>
                <span>{activePreset === 'books' ? booksParsed.length : studentsParsed.length} records parsed and validated.</span>
              </div>
            </div>
            <button
              onClick={commitParsedData}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded transition-all flex items-center gap-1"
            >
              <span>{activePreset === 'books' ? t.commitBooks : t.commitStudents}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terminal Stream Verification Logs:</span>
            <div className="bg-slate-900 text-emerald-400 p-2.5 rounded text-[10px] font-mono max-h-36 overflow-y-auto leading-relaxed">
              {logs.map((log, idx) => (
                <div key={idx}>[SUCCESS] {log}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
