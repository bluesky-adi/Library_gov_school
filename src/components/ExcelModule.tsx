/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, AlertTriangle, Download, ArrowRight, Table, HelpCircle, Users } from 'lucide-react';
import { Book, Student } from '../types';

interface ExcelModuleProps {
  onImportBooks: (importedBooks: Book[]) => void;
  onImportStudents: (importedStudents: Student[]) => void;
  currentLang: 'EN' | 'HI';
  existingBooks?: Book[];
  existingStudents?: Student[];
}

export default function ExcelModule({ onImportBooks, onImportStudents, currentLang, existingBooks, existingStudents }: ExcelModuleProps) {
  const [activePreset, setActivePreset] = useState<'books' | 'students'>('books');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booksParsed, setBooksParsed] = useState<Book[]>([]);
  const [studentsParsed, setStudentsParsed] = useState<Student[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [detectedFormat, setDetectedFormat] = useState<'school' | 'template' | 'custom' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States to facilitate sheet selection, expectation calculations and previews
  const [sheetsAvailable, setSheetsAvailable] = useState<{ name: string; rawData: any[] }[]>([]);
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'entire' | 'multiple' | 'single'>('entire');

  const [successReport, setSuccessReport] = useState<{
    booksImported: number;
    booksSkipped: number;
    duplicateBooks: number;
    databaseTotalBooks: number;
  } | null>(null);

  const t = {
    EN: {
      zoneHelpBooks: "Drag & drop your school books Excel sheet here, or click to upload",
      zoneHelpStudents: "Drag & drop your students.xlsx file here, or click to upload",
      columnsBooks: "Accepts BOTH 1) Official School Format (Accession No., Title, Author, Publisher, Subject, Book no, Remarks...) and 2) Custom template columns (Book Name, Author, Publisher, Category, Description, Copies).",
      columnsStudents: "Columns required: Name, Roll Number, DOB, Class, Section",
      loadSampleBooks: "Load PM SHRI School Format Sample",
      loadSampleStudents: "Load Sample students.xlsx",
      parseSuccess: "Spreadsheet parsed successfully!",
      validationPassed: "All validation constraints resolved! Ready to import.",
      commitBooks: "Commit Books to Cloud Inventory",
      commitStudents: "Commit Students to Roster Ledger",
      invalidHeaders: "Unrecognized headers. Please ensure columns conform to School Ledger or Template format.",
      noRows: "No data rows detected in the uploaded spreadsheet."
    },
    HI: {
      zoneHelpBooks: "अपनी स्कूल बुक्स एक्सेल शीट को यहाँ ड्रैग और ड्रॉप करें, या अपलोड करने के लिए क्लिक करें",
      zoneHelpStudents: "अपनी students.xlsx फ़ाइल को यहाँ ड्रैग और ड्रॉप करें, या अपलोड करने के लिए क्लिक करें",
      columnsBooks: "दोनों समर्थित हैं: 1) आधिकारिक स्कूल प्रारूप (Accession No., Title, Author, Publisher, Subject, Book no, Remarks...) और 2) सामान्य टेम्पलेट (Book Name, Author, Publisher, Category, Description, Copies).",
      columnsStudents: "आवश्यक कॉलम: Name, Roll Number, DOB, Class, Section",
      loadSampleBooks: "पीएम श्री स्कूल प्रारूप नमूना लोड करें",
      loadSampleStudents: "नमूना students.xlsx डेटा लोड करें",
      parseSuccess: "स्प्रेडशीट का सफलतापूर्वक विश्लेषण किया गया!",
      validationPassed: "सभी सत्यापन मानदंड पारित! आयात के लिए तैयार।",
      commitBooks: "पुस्तकों को क्लाउड इन्वेंटरी में दर्ज करें",
      commitStudents: "छात्रों को मुख्य रजिस्टर में दर्ज करें",
      invalidHeaders: "अपरिचित कॉलम हेडर। कृपया लेज़र या टेम्पलेट प्रारूप की जांच करें।",
      noRows: "अपलोड की गई शीट में कोई डेटा पंक्तियाँ नहीं मिलीं।"
    }
  }[currentLang];

  const validateStudentHeaders = (headers: string[]): boolean => {
    const required = ["Name", "Roll Number", "DOB", "Class", "Section"];
    return required.every(field => headers.some(h => h.trim().toLowerCase() === field.toLowerCase()));
  };

  const determineDdcCategory = (callNumber?: string): string => {
    if (!callNumber) return "Needs Librarian Review";
    const trimStr = String(callNumber).trim();
    if (trimStr === "") return "Needs Librarian Review";
    
    const numMatch = trimStr.match(/^\d+/);
    if (!numMatch) return "Needs Librarian Review";
    
    const num = parseInt(numMatch[0], 10);
    if (isNaN(num)) return "Needs Librarian Review";
    
    if (num >= 0 && num < 100) return "000 General Works";
    if (num >= 100 && num < 200) return "100 Philosophy";
    if (num >= 200 && num < 300) return "200 Religion";
    if (num >= 300 && num < 400) return "300 Social Sciences";
    if (num >= 400 && num < 500) return "400 Language";
    if (num >= 500 && num < 600) return "500 Science";
    if (num >= 600 && num < 700) return "600 Technology";
    if (num >= 700 && num < 800) return "700 Arts";
    if (num >= 800 && num < 900) return "800 Literature";
    if (num >= 900 && num < 1000) return "900 History & Geography";
    return "Needs Librarian Review";
  };

  const parseBooksFromSheetData = (
    sheetData: any[], 
    sheetCategory: string,
    validationLogs: string[],
    validationWarnings: string[]
  ): Book[] => {
    return sheetData.map((row, index) => {
      // Safe case-and-whitespace-and-punctuation-insensitive field finder
      const findVal = (keys: string[]) => {
        for (const key of keys) {
          const foundKey = Object.keys(row).find(k => {
            const cleanK = k.trim().toLowerCase().replace(/[\s\._\-]+/g, '');
            const cleanKey = key.trim().toLowerCase().replace(/[\s\._\-]+/g, '');
            return cleanK === cleanKey;
          });
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      const titleVal = findVal(["Title", "Book Name", "bookName", "title"]);
      const authorVal = findVal(["Author", "author"]);
      const publisherVal = findVal(["Publisher", "publisher"]);
      const accessionVal = findVal(["Accession Number", "Accession. No.", "Accession. No", "Accession No.", "Accession No", "accession no", "accession", "acc no", "acc_no"]);
      const yop = findVal(["Year of Publication", "Year", "Y.O.P", "YOP", "yop", "year"]);
      const pop = findVal(["Place of Publication", "P.O.P", "POP", "pop", "place"]);
      const editor = findVal(["Editor", "editor"]);
      const edition = findVal(["Edition", "edition"]);
      const volume = findVal(["Volume", "volume", "vol"]);
      const page = findVal(["Pages", "Page", "pages", "page", "pg"]);
      const priceVal = findVal(["Price", "price", "amount"]);
      const callNumberVal = findVal(["Call Number", "Call No.", "Call No", "CallNo", "call number", "callno"]);
      const bookNoVal = findVal(["Book Number", "Book no.", "Book No.", "book no", "bookNumber", "book_no", "bookNo"]);
      const sourceVal = findVal(["Source", "source"]);
      const remarksVal = findVal(["Remarks", "remarks", "Notes", "notes"]);
      const descVal = findVal(["Description", "description"]);

      const bookName = titleVal ? String(titleVal).trim() : "";
      const finalBookName = bookName || `Untitled Book #${index + 1}`;
      if (!bookName) {
        validationWarnings.push(`[${sheetCategory}] Row ${index + 2}: Empty Title field. Assigned placeholder.`);
      }
      
      const finalAuthor = authorVal ? String(authorVal).trim() : "Unknown Author";
      const finalPublisher = publisherVal ? String(publisherVal).trim() : "Unknown Publisher";

      let accession = "";
      if (accessionVal !== undefined && accessionVal !== null) {
        accession = String(accessionVal).trim();
      }
      
      let finalBookId = accession;
      if (!finalBookId) {
        const fallId = findVal(["bookId", "ID", "BookId", "Book ID"]);
        if (fallId) {
          finalBookId = String(fallId).trim();
          accession = finalBookId;
        } else {
          finalBookId = `ACC-${Date.now().toString().slice(-4)}-${index + 1}`;
          accession = finalBookId;
          validationWarnings.push(`[${sheetCategory}] Row ${index + 2} ('${finalBookName}'): Accession Number is missing! Created key '${finalBookId}'.`);
        }
      }

      let finalCopies = 1;
      const copiesVal = findVal(["Copies", "copies", "Quantity", "quantity"]);
      if (copiesVal !== undefined && copiesVal !== null) {
        const parsedCops = parseInt(String(copiesVal).trim());
        if (!isNaN(parsedCops) && parsedCops >= 0) {
          finalCopies = parsedCops;
        }
      }

      const callNumber = callNumberVal ? String(callNumberVal).trim() : "";
      const ddcCategory = determineDdcCategory(callNumber);
      const primaryCategory = callNumber ? ddcCategory : (sheetCategory || "Generalities");

      let finalDescription = descVal ? String(descVal).trim() : "";
      if (!finalDescription) {
        const descParts: string[] = [];
        if (yop) descParts.push(`Published: ${yop}`);
        if (edition) descParts.push(`Edition: ${edition}`);
        if (volume) descParts.push(`Volume: ${volume}`);
        if (callNumber) descParts.push(`Call No: ${callNumber}`);
        finalDescription = descParts.length > 0 ? descParts.join(" | ") : "Ramdiri School Academic Library asset.";
      }

      validationLogs.push(`Mapped Row ${index + 2} [ID: ${finalBookId}] with DDC: ${primaryCategory}`);

      return {
        bookId: finalBookId,
        bookName: finalBookName,
        author: finalAuthor,
        publisher: finalPublisher,
        category: primaryCategory,
        description: finalDescription,
        totalCopies: finalCopies,
        availableCopies: finalCopies,
        accessionNumber: accession,
        yearOfPublication: yop ? String(yop).trim() : "",
        placeOfPublication: pop ? String(pop).trim() : "",
        editor: editor ? String(editor).trim() : "",
        edition: edition ? String(edition).trim() : "",
        volume: volume ? String(volume).trim() : "",
        pages: page ? String(page).trim() : "",
        price: priceVal ? String(priceVal).trim() : "",
        callNumber: callNumber,
        bookNumber: bookNoVal ? String(bookNoVal).trim() : "",
        source: sourceVal ? String(sourceVal).trim() : "",
        remarks: remarksVal ? String(remarksVal).trim() : "",
        ddcCategory: ddcCategory
      };
    });
  };

  const handleCancelClearReset = () => {
    setSheetsAvailable([]);
    setSelectedSheetNames([]);
    setBooksParsed([]);
    setStudentsParsed([]);
    setWarnings([]);
    setIsValidated(false);
    setErrorMessage(null);
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSheetSelectionChange = (sheetName: string, checked: boolean) => {
    if (importMode === 'single') {
      setSelectedSheetNames([sheetName]);
    } else {
      if (checked) {
        setSelectedSheetNames(prev => [...prev, sheetName]);
      } else {
        setSelectedSheetNames(prev => prev.filter(s => s !== sheetName));
      }
    }
  };

  const handleExecuteSheetAnalysis = () => {
    if (selectedSheetNames.length === 0) {
      setErrorMessage(currentLang === 'EN' ? "Please select at least one worksheet." : "कृपया कम से कम एक कार्यपत्रक चुनें।");
      return;
    }

    const validationLogs: string[] = [];
    const validationWarnings: string[] = [];

    if (activePreset === 'books') {
      const booksList: Book[] = [];
      setDetectedFormat('school');

      sheetsAvailable.forEach(sheet => {
        if (selectedSheetNames.includes(sheet.name)) {
          validationLogs.push(`Spreadsheet analyzer: Parsing active worksheet [${sheet.name}] with ${sheet.rawData.length} entries.`);
          const parsedSheetBooks = parseBooksFromSheetData(sheet.rawData, sheet.name, validationLogs, validationWarnings);
          booksList.push(...parsedSheetBooks);
        }
      });

      if (booksList.length === 0) {
        setErrorMessage(t.noRows);
        setIsValidated(false);
        return;
      }

      setErrorMessage(null);
      setBooksParsed(booksList);
      setStudentsParsed([]);
      setWarnings(validationWarnings);
      setIsValidated(true);
      setLogs(validationLogs);
    } else {
      // Student worksheet validating selection
      let hasInvalidHeaders = false;
      sheetsAvailable.forEach(sheet => {
        if (selectedSheetNames.includes(sheet.name)) {
          if (sheet.rawData.length > 0) {
            const headers = Object.keys(sheet.rawData[0]);
            if (!validateStudentHeaders(headers)) {
              hasInvalidHeaders = true;
            }
          }
        }
      });

      if (hasInvalidHeaders) {
        setErrorMessage(t.invalidHeaders + " " + t.columnsStudents);
        setStudentsParsed([]);
        setIsValidated(false);
        return;
      }

      const studentsList: Student[] = [];
      sheetsAvailable.forEach(sheet => {
        if (selectedSheetNames.includes(sheet.name)) {
          sheet.rawData.forEach((row, index) => {
            const nameRaw = row["Name"] || row["name"];
            const name = nameRaw ? nameRaw.toString().trim() : "";
            
            const rollRaw = row["Roll Number"] || row["roll number"];
            const rollNumber = parseInt(rollRaw || "0", 10);
            
            const dobRaw = row["DOB"] || row["dob"];
            const classRaw = row["Class"] || row["class"];
            const studClass = classRaw ? classRaw.toString().trim() : "";
            
            const sectionRaw = row["Section"] || row["section"];
            const section = sectionRaw ? sectionRaw.toString().trim().toUpperCase() : "";

            if (!name) {
              validationWarnings.push(`Row ${index + 2} in [${sheet.name}]: Student name is missing. Skipping.`);
              return;
            }
            if (!studClass) {
              validationWarnings.push(`Row ${index + 2} in [${sheet.name}]: Student '${name}' is missing Class. Skipping.`);
              return;
            }
            if (!section) {
              validationWarnings.push(`Row ${index + 2} in [${sheet.name}]: Student '${name}' is missing Section. Skipping.`);
              return;
            }
            if (isNaN(rollNumber) || rollNumber <= 0) {
              validationWarnings.push(`Row ${index + 2} in [${sheet.name}]: Student '${name}' is missing a valid manually-assigned Roll Number. Skipping.`);
              return;
            }
            if (!dobRaw) {
              validationWarnings.push(`Row ${index + 2} in [${sheet.name}]: Student '${name}' is missing Date of Birth (DOB). Skipping.`);
              return;
            }

            let dob = "2010-01-01";
            if (dobRaw) {
              if (typeof dobRaw === 'number' && dobRaw > 1000) {
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

            validationLogs.push(`[${sheet.name}] Verified student: '${name}' | Class Grade: ${studClass}-${section} | Roll: #${rollNumber}`);
            const finalId = `${studClass.toUpperCase()}-${section.toUpperCase()}-${rollNumber}`;

            studentsList.push({
              studentId: finalId,
              name,
              rollNumber,
              dob,
              class: studClass,
              section
            });
          });
        }
      });

      if (studentsList.length === 0) {
        setErrorMessage(t.noRows);
        setIsValidated(false);
        return;
      }

      setErrorMessage(null);
      setStudentsParsed(studentsList);
      setBooksParsed([]);
      setWarnings(validationWarnings);
      setIsValidated(true);
      setLogs(validationLogs);
    }
  };

  const processFileContents = (sheetData: any[]) => {
    const simulatedSheet = { name: "Sheet1", rawData: sheetData };
    setSheetsAvailable([simulatedSheet]);
    setSelectedSheetNames(["Sheet1"]);
    setImportMode('entire');
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
        
        const loadedSheets = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          const sheetData = XLSX.utils.sheet_to_json<any>(worksheet);
          return { name, rawData: sheetData };
        }).filter(sheet => sheet.rawData.length > 0);

        if (loadedSheets.length === 0) {
          setErrorMessage(t.noRows);
          setIsValidated(false);
          setSheetsAvailable([]);
          setSelectedSheetNames([]);
          return;
        }

        setSheetsAvailable(loadedSheets);
        const allSheetNames = loadedSheets.map(s => s.name);
        setSelectedSheetNames(allSheetNames);
        setImportMode('entire');
        setErrorMessage(null);
        setIsValidated(false);
        setBooksParsed([]);
        setStudentsParsed([]);
        setWarnings([]);
        setLogs([`File loaded successfully! Detected ${loadedSheets.length} worksheets: ${allSheetNames.join(', ')}`]);
      } catch (err) {
        setErrorMessage(currentLang === 'EN' ? "Failed to read excel file. Please check file structure." : "एक्सेल फ़ाइल पढ़ने में विफल। कृपया फ़ाइल की संरचना की जांच करें।");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSamplePreset = () => {
    if (activePreset === 'books') {
      const sampleBooks = [
        {
          "Accession. No.": "ACC-5421",
          "Title": "Bhautiki NCERT Class 10 (भौतिकी)",
          "Author": "NCERT Board Bihar",
          "Publisher": "BSTBPC, Patna",
          "Y.O.P": "25-02-2023",
          "P.O.P": "Patna Main Printing Press",
          "Editor": "Govt of Bihar Panel",
          "Edition": "Fifth",
          "Volume": "I",
          "Page": "184",
          "Price": "140.00",
          "Call Number": "530 BIH",
          "Book no": "B-NCERT-5100",
          "Subject": "Academic Physics",
          "Remarks": "Compulsory syllabus textbook for metric examinees."
        },
        {
          "Accession. No.": "ACC-7892",
          "Title": "Godan (गोदान - औपन्यासिक कृति)",
          "Author": "Munshi Premchand",
          "Publisher": "Saraswati Press",
          "Y.O.P": "2018",
          "P.O.P": "Varanasi",
          "Editor": "Dr. Ram Bilas Sharma",
          "Edition": "Platinum Collection",
          "Volume": "N/A",
          "Page": "320",
          "Price": "195.00",
          "Call Number": "891.4 PRE",
          "Book no": "B-LIT-043",
          "Subject": "Hindi Literature",
          "Remarks": "Famous regional novel on farmer life struggles in Purvanchal."
        },
        {
          "Accession. No.": "ACC-3310",
          "Title": "Secondary Board Ganit Class 10",
          "Author": "Dr. K.C. Sinha",
          "Publisher": "Student Friends Publishers",
          "Y.O.P": "2024",
          "P.O.P": "Patna",
          "Editor": "Prof. S. R. Sharma",
          "Edition": "12th revised",
          "Volume": "III",
          "Page": "450",
          "Price": "340.00",
          "Call Number": "510 SIN",
          "Book no": "B-MATH-092",
          "Subject": "Academic Mathematics",
          "Remarks": "Comprehensive analytical trigonometry chapters."
        }
      ];
      const simulatedSheets = [
        { name: "MAIN", rawData: [sampleBooks[0], sampleBooks[2]] },
        { name: "LITERATURE", rawData: [sampleBooks[1]] },
        { name: "SCI&MTH", rawData: [] }
      ].filter(s => s.rawData.length > 0);

      setSheetsAvailable(simulatedSheets);
      setSelectedSheetNames(simulatedSheets.map(s => s.name));
      setImportMode('entire');
      setErrorMessage(null);
      setIsValidated(false);
      setBooksParsed([]);
      setStudentsParsed([]);
      setWarnings([]);
      setLogs(["Simulated school workbook loaded natively with categories: MAIN, LITERATURE."]);
    } else {
      const sampleStudents = [
        { "Name": "Ranjit Singh", "Roll Number": 15, "DOB": "2010-08-12", "Class": "10", "Section": "A" },
        { "Name": "Meera Chaurasia", "Roll Number": 8, "DOB": "2011-03-24", "Class": "9", "Section": "B" },
        { "Name": "Amit Kumar Paswan", "Roll Number": 21, "DOB": "2010-11-05", "Class": "10", "Section": "C" }
      ];
      const simulatedSheets = [
        { name: "Roster_Sheet", rawData: sampleStudents }
      ];

      setSheetsAvailable(simulatedSheets);
      setSelectedSheetNames(["Roster_Sheet"]);
      setImportMode('entire');
      setErrorMessage(null);
      setIsValidated(false);
      setBooksParsed([]);
      setStudentsParsed([]);
      setWarnings([]);
      setLogs(["Simulated student roster workbook loaded successfully."]);
    }
  };

  const commitParsedData = () => {
    if (activePreset === 'books' && booksParsed.length > 0) {
      // Calculate duplicate books (exist already in database)
      const existingIds = new Set((existingBooks || []).map(b => b.bookId));
      let duplicateCount = 0;
      booksParsed.forEach(b => {
        if (existingIds.has(b.bookId)) {
          duplicateCount++;
        }
      });

      const importedCount = booksParsed.length;
      const skippedCount = 0;
      const originalCount = (existingBooks || []).length;
      const newTotal = originalCount + (importedCount - duplicateCount);

      setSuccessReport({
        booksImported: importedCount,
        booksSkipped: skippedCount,
        duplicateBooks: duplicateCount,
        databaseTotalBooks: newTotal
      });

      onImportBooks(booksParsed);
      setBooksParsed([]);
      setWarnings([]);
      setIsValidated(false);
      setLogs([]);
    } else if (activePreset === 'students' && studentsParsed.length > 0) {
      onImportStudents(studentsParsed);
      setStudentsParsed([]);
      setWarnings([]);
      setIsValidated(false);
      setLogs([]);
      setSuccessReport(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const displayCount = activePreset === 'books' ? booksParsed.length : studentsParsed.length;

  return (
    <div id="excel-and-student-uploader" className="space-y-4">
      {successReport && (
        <div className="bg-emerald-50 dark:bg-slate-900 border-2 border-emerald-500 rounded-xl p-5 space-y-3 shadow-md animate-fade-in relative">
          <button 
            onClick={() => setSuccessReport(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
            title="Dismiss Report"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 select-none">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Bulk Books Import Success Report
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="bg-white dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 p-3 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Books Imported</span>
              <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                {successReport.booksImported}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Books Skipped</span>
              <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                {successReport.booksSkipped}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Duplicate Overwrites</span>
              <span className="text-base font-black text-amber-600 mt-1 block">
                {successReport.duplicateBooks}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 border border-emerald-250 dark:border-slate-850 p-3 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Database Total Books</span>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                {successReport.databaseTotalBooks}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 text-center leading-normal select-none">
            All spreadsheet accession rows have been successfully committed to the database ledger inventory.
          </p>
        </div>
      )}

      {/* Switch Upload Type */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => {
            setActivePreset('books');
            setIsValidated(false);
            setErrorMessage(null);
            setBooksParsed([]);
            setStudentsParsed([]);
            setWarnings([]);
          }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activePreset === 'books'
              ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          {currentLang === 'EN' ? "Upload Official Books" : "सरकारी किताबें लोड करें (Ledger Spreadsheet)"}
        </button>
        <button
          onClick={() => {
            setActivePreset('students');
            setIsValidated(false);
            setErrorMessage(null);
            setBooksParsed([]);
            setStudentsParsed([]);
            setWarnings([]);
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
            ? (currentLang === 'EN' ? "PM SHRI Ramdiri+2 Official School Layout Support" : "पीएम श्री रामदिरी+2 आधिकारिक स्कूल प्रारूप समर्थन")
            : (currentLang === 'EN' ? "XLSX Students Import Template" : "XLSX छात्र सूची आयात टेम्पलेट")
          }
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          {activePreset === 'books' ? t.columnsBooks : t.columnsStudents}
        </p>
      </div>

      {/* Upload Drag Drop Area */}
      {sheetsAvailable.length === 0 ? (
        <div 
          onClick={triggerFileSelect}
          className="border-2 border-dashed border-slate-300 dark:border-slate-850 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer bg-slate-55/40 hover:bg-slate-100/30 dark:bg-slate-950 transition-all select-none"
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
            {currentLang === 'EN' ? "Accepts standard school .xlsx or .xls spreadsheets" : ".xlsx या .xls स्प्रेडशीट का समर्थन करता है"}
          </p>
        </div>
      ) : (
        /* Integrated sheet selection controls */
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in" id="xlsx-sheets-config-panel">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Worksheet Configuration & Selection
            </h4>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-750 dark:text-slate-250 px-2.5 py-0.5 rounded-full font-bold">
              {sheetsAvailable.length} Worksheet(s) Found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Import Mode Selection */}
            <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-4 md:pb-0 md:pr-4">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Import Choice Mode</label>
              <div className="space-y-2 font-semibold">
                <label className="flex items-center gap-2 text-xs text-slate-705 dark:text-slate-350 cursor-pointer">
                  <input
                    type="radio"
                    name="import-choices"
                    checked={importMode === 'entire'}
                    onChange={() => {
                      setImportMode('entire');
                      setSelectedSheetNames(sheetsAvailable.map(s => s.name));
                      setIsValidated(false);
                      setBooksParsed([]);
                      setStudentsParsed([]);
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                    id="import-entire-choice"
                  />
                  Import Entire Workbook
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-705 dark:text-slate-350 cursor-pointer">
                  <input
                    type="radio"
                    name="import-choices"
                    checked={importMode === 'single'}
                    onChange={() => {
                      setImportMode('single');
                      if (sheetsAvailable.length > 0) {
                        setSelectedSheetNames([sheetsAvailable[0].name]);
                      }
                      setIsValidated(false);
                      setBooksParsed([]);
                      setStudentsParsed([]);
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                    id="import-single-choice"
                  />
                  Import Selected Sheet
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-705 dark:text-slate-350 cursor-pointer">
                  <input
                    type="radio"
                    name="import-choices"
                    checked={importMode === 'multiple'}
                    onChange={() => {
                      setImportMode('multiple');
                      setIsValidated(false);
                      setBooksParsed([]);
                      setStudentsParsed([]);
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                    id="import-multiple-choice"
                  />
                  Import Multiple Sheets
                </label>
              </div>
            </div>

            {/* Worksheet Selector list */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block">Worksheets in spreadsheet</label>
              {importMode === 'single' ? (
                <select
                  value={selectedSheetNames[0] || ""}
                  onChange={(e) => {
                    setSelectedSheetNames([e.target.value]);
                    setIsValidated(false);
                    setBooksParsed([]);
                    setStudentsParsed([]);
                  }}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none font-bold text-slate-905 dark:text-white"
                  id="excel-single-sheet-select"
                >
                  {sheetsAvailable.map(sheet => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name} ({sheet.rawData.length} lines)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5 bg-white dark:bg-slate-900" id="excel-multi-sheets-list">
                  {sheetsAvailable.map(sheet => {
                    const isChecked = selectedSheetNames.includes(sheet.name);
                    return (
                      <label key={sheet.name} className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-md">
                        <input
                          type="checkbox"
                          disabled={importMode === 'entire'}
                          checked={isChecked}
                          onChange={(e) => {
                            handleSheetSelectionChange(sheet.name, e.target.checked);
                            setIsValidated(false);
                            setBooksParsed([]);
                            setStudentsParsed([]);
                          }}
                          className="text-emerald-600 rounded focus:ring-emerald-500"
                          id={`sheet-checkbox-${sheet.name}`}
                        />
                        <span className="truncate">{sheet.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">({sheet.rawData.length} rows)</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Telemetry and Action Controls before final parsing */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div>
                <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider block">Selected Sheets:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-400 font-mono text-xs block mt-0.5 truncate max-w-sm sm:max-w-md">
                  {selectedSheetNames.length > 0 ? selectedSheetNames.join(', ') : 'None selected'}
                </span>
              </div>
              <div className="pt-1">
                <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider block">Expected Record Count:</span>
                <span className="font-black text-indigo-750 dark:text-indigo-455 text-sm font-mono block mt-0.5" id="xlsx-expected-row-count-stat">
                  {sheetsAvailable
                    .filter(sheet => selectedSheetNames.includes(sheet.name))
                    .reduce((acc, sheet) => acc + sheet.rawData.length, 0)
                    .toLocaleString()}{" "}
                  raw spreadsheet entries
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelClearReset}
                className="px-4 py-2 border border-slate-250 dark:border-slate-750 text-slate-605 dark:text-slate-350 hover:bg-slate-200/50 dark:hover:bg-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer"
                id="cancel-and-reset-upload-btn"
              >
                Cancel & Clear
              </button>
              <button
                type="button"
                disabled={selectedSheetNames.length === 0}
                onClick={handleExecuteSheetAnalysis}
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-lg transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                id="generate-ledgers-preview-btn"
              >
                <span>Preview Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {sheetsAvailable.length === 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={loadSamplePreset}
            className="px-3 py-1.5 border border-slate-200 text-[11px] font-bold text-slate-700 dark:text-slate-350 bg-white hover:bg-slate-50 rounded transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {activePreset === 'books' ? t.loadSampleBooks : t.loadSampleStudents}
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-3.5 rounded-lg flex items-start gap-2 text-xs text-red-800 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Validation success summary, dynamic warnings, and real data preview */}
      {isValidated && (
        <div className="border border-emerald-300 bg-emerald-50/5 dark:bg-slate-900 rounded-xl p-5 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100 dark:border-slate-800 pb-4">
            <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-sm block text-emerald-900 dark:text-emerald-300">{t.parseSuccess}</span>
                <span className="text-[11px] block mt-0.5 text-slate-600 dark:text-slate-400">
                  Detected Layout Level: <b className="uppercase font-extrabold text-indigo-750 dark:text-indigo-400">{detectedFormat || "Standard"} Format</b>.
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300 mt-1 block">
                  Identified <b>{displayCount} record(s)</b> fully mapped and prepared for secure import.
                </span>
              </div>
            </div>
            
            <button
              onClick={commitParsedData}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 w-full md:w-auto cursor-pointer"
            >
              <span>{activePreset === 'books' ? t.commitBooks : t.commitStudents} ({displayCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* WARNINGS BLOCK - Shows non-blocking errors dynamically */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 space-y-1.5">
              <span className="text-amber-800 dark:text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Import Validation Warnings ({warnings.length}):</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono text-amber-700 dark:text-amber-300/80 prose prose-sm leading-relaxed">
                {warnings.map((warn, i) => (
                  <div key={i}>⚠️ Warning {i+1}: {warn}</div>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 text-left">
                (Note: These warnings will not prevent catalog submission. The system resolves columns gracefully, but you may want to review.)
              </p>
            </div>
          )}

          {/* PREVIEW TABLE OF BOOKS/STUDENTS DATAFORMS */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Table className="w-4 h-4 text-indigo-650 shrink-0" />
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block">
                Previewing Mapped Records (First {Math.min(displayCount, 5)} of {displayCount}):
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-205 dark:border-slate-800 rounded-lg max-h-60 bg-white dark:bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  {activePreset === 'books' ? (
                    <tr>
                      <th className="p-2">Accession No / Book ID</th>
                      <th className="p-2">Book Name</th>
                      <th className="p-2">Author</th>
                      <th className="p-2">Publisher</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-center">Copies</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-2">Roll Number</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">DOB</th>
                      <th className="p-2 text-center">Class</th>
                      <th className="p-2 text-center">Section</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                  {activePreset === 'books' ? (
                    booksParsed.slice(0, 5).map((bk, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-2 font-mono text-[10px] uppercase text-emerald-800 dark:text-emerald-400 font-bold">{bk.bookId}</td>
                        <td className="p-2 font-bold max-w-xs truncate" title={bk.bookName}>{bk.bookName}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-350">{bk.author}</td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">{bk.publisher}</td>
                        <td className="p-2 text-slate-500"><span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{bk.category}</span></td>
                        <td className="p-2 text-center font-bold">{bk.totalCopies}</td>
                      </tr>
                    ))
                  ) : (
                    studentsParsed.slice(0, 5).map((st, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-2 font-mono font-bold text-center">#{st.rollNumber}</td>
                        <td className="p-2 font-bold">{st.name}</td>
                        <td className="p-2 font-mono text-[11px]">{st.dob}</td>
                        <td className="p-2 text-center font-bold">Grade {st.class}</td>
                        <td className="p-2 text-center font-bold">{st.section}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {displayCount > 5 && (
              <p className="text-[10px] text-slate-400 text-right italic">
                showing 5 records of {displayCount} total. All {displayCount} will be committed upon click.
              </p>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Terminal Logs:</span>
            <div className="bg-slate-950 text-emerald-400 p-2.5 rounded text-[9px] font-mono max-h-24 overflow-y-auto leading-normal">
              {logs.map((log, idx) => (
                <div key={idx}>[LOG] {log}</div>
              ))}
            </div>
          </div>

          {/* Cancellation and preview action footer layout */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleCancelClearReset}
              className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-700 hover:text-red-800 font-bold text-xs rounded-lg transition-all border border-red-200 cursor-pointer flex items-center gap-1.5"
              id="clear-parsed-previews-btn"
            >
              Cancel Import / Clear Preview
            </button>

            <button
              onClick={commitParsedData}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              id="commit-imports-execution-btn"
            >
              <span>{activePreset === 'books' ? t.commitBooks : t.commitStudents} ({displayCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
