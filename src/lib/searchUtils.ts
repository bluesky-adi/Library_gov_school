/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Fuse from 'fuse.js';
import { Book } from '../types';

export const HINGLISH_MAP: { [key: string]: string } = {
  "itihas": "इतिहास", "itihaas": "इतिहास", "history": "इतिहास",
  "vigyan": "विज्ञान", "vijnan": "विज्ञान", "science": "विज्ञान",
  "ganit": "गणित", "maths": "गणित", "math": "गणित", "mathematics": "गणित", "ganitha": "गणित",
  "bhugol": "भूगोल", "geography": "भूगोल",
  "rasayan": "रसायन", "chemistry": "रसायन",
  "bhautiki": "भौतिकी", "physics": "भौतिकी",
  "samajik": "सामाजिक", "social": "सामाजिक",
  "hindi": "हिन्दी", "hindee": "हिन्दी",
  "dinkar": "दिनकर", "ramdhari": "रामधारी",
  "rashmirathi": "रश्मिरथी",
  "godhuli": "गोधूलि",
  "bseb": "बिहार", "patna": "पटना",
  "bihar": "बिहार",
  "shri": "श्री", "pustak": "पुस्तक",
  "upanyas": "उपन्यास", "katha": "कथा",
  "vyakaran": "व्याकरण", "grammar": "व्याकरण",
  "ncert": "एनसीईआरटी",
  "premchand": "प्रेमचंद", "munshi": "मुंशी",
  "pathya": "पाठ्य", "shiksha": "शिक्षा",
  "sanskrut": "संस्कृत", "sanskrit": "संस्कृत", "sanskrith": "संस्कृत",
  "english": "अंग्रेजी", "angreji": "अंग्रेजी", "angrezi": "अंग्रेजी",
  "urdu": "उर्दू",
  "raajneeti": "राजनीति", "rajniti": "राजनीति", "polscience": "राजनीति", "nagarik": "नागरिक", "civics": "नागरिक शास्त्र",
  "arthashastra": "अर्थशास्त्र", "economics": "अर्थशास्त्र",
  "pariksha": "परीक्षा", "exam": "परीक्षा",
  "kavita": "कविता", "poem": "कविता",
  "kahani": "कहानी", "story": "कहानी",
  "jivan": "जीवन", "biography": "जीवनी",
  "sahitya": "साहित्य", "literature": "साहित्य"
};

// Map search terms of DDC class numbers to subject terms
export const DDC_CLASS_SUBJECTS: { [key: string]: string } = {
  "000": "general information computer science computing books library research cyber 005",
  "100": "philosophy psychology ethics logic mind 100",
  "200": "religion spirituality god bible quran veda 200",
  "300": "social sciences civics economics sociology law politics education 300 398",
  "400": "language grammar sanskrit english hindi languages linguistics 400",
  "500": "science mathematics biology math geometry physics chemistry astronomy geology 500",
  "600": "technology engineering medical health agriculture applied science electronics electricity 600",
  "700": "arts recreation sports games music painting theater 700",
  "800": "literature poems drama stories essays novels poetry 800",
  "900": "history geography travel maps biography historical world 900"
};

/**
 * Unified, canonical DDC category classification function.
 * This is the SINGLE SOURCE OF TRUTH for the entire application.
 */
export function getDdcCategoryName(ddcNumStr: string | undefined | null): string {
  if (!ddcNumStr) return "Needs Librarian Review";
  const trimStr = String(ddcNumStr).trim();
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
}

/**
 * Helper to compute transliteration search keywords for a book record.
 */
function getTransliterationKeywords(book: Book): string {
  const text = `${book.bookName || ""} ${book.author || ""} ${book.category || ""} ${book.description || ""}`.toLowerCase();
  const keywords: string[] = [];
  for (const [eng, hin] of Object.entries(HINGLISH_MAP)) {
    if (text.includes(eng) || text.includes(hin.toLowerCase())) {
      keywords.push(eng, hin);
    }
  }
  return keywords.join(' ');
}

/**
 * Helper to retrieve DDC century class.
 */
function getCenturyClass(ddc: string | undefined | null): string {
  if (!ddc) return "";
  const match = ddc.trim().match(/^\d+/);
  if (!match) return "";
  const num = parseInt(match[0], 10);
  if (isNaN(num)) return "";
  const century = Math.floor(num / 100) * 100;
  if (century >= 0 && century < 1000) {
    return String(century).padStart(3, '0');
  }
  return "";
}

/**
 * Modern, high-performance Fuse.js smart search engine.
 */
export function searchBooksSmart(
  books: Book[], 
  query: string, 
  categorySerialsMap?: Map<string, number>
): Book[] {
  if (!query || !query.trim()) return books;
  
  const decodedQuery = query.toLowerCase().trim();
  
  // 1. Enriched Books for Fuse indexing
  const enrichedBooks = books.map(book => {
    const bookDdc = book.ddcNumber || book.callNumber || "";
    const century = getCenturyClass(bookDdc);
    const ddcKeywords = century ? (DDC_CLASS_SUBJECTS[century] || "") : "";
    const translit = getTransliterationKeywords(book);
    
    // Add shelf serial number string if present
    const catSerial = categorySerialsMap ? String(categorySerialsMap.get(book.bookId) || "") : "";
    
    return {
      book,
      bookId: book.bookId,
      bookName: book.bookName || "",
      author: book.author || "",
      publisher: book.publisher || "",
      category: book.category || "",
      description: book.description || "",
      accessionNumber: book.accessionNumber || "",
      callNumber: book.callNumber || "",
      bookNumber: book.bookNumber || "",
      ddcNumber: book.ddcNumber || "",
      _ddcKeywords: ddcKeywords,
      _transliteration: translit,
      _shelfSerial: catSerial,
    };
  });

  // 2. Expand Query for bilingual matching
  const tokens = decodedQuery.split(/[\s,.\-/]+/).filter(t => t.length > 0);
  const expandedTokens: string[] = [];
  for (const token of tokens) {
    expandedTokens.push(token);
    if (HINGLISH_MAP[token]) {
      expandedTokens.push(HINGLISH_MAP[token]);
    }
    for (const [eng, hin] of Object.entries(HINGLISH_MAP)) {
      if (token === hin || hin.toLowerCase() === token) {
        expandedTokens.push(eng);
      }
    }
  }
  const expandedQuery = Array.from(new Set(expandedTokens)).join(' ');

  // 3. Configure Fuse.js with optimized weights & thresholds
  const options = {
    keys: [
      { name: 'accessionNumber', weight: 4.5 },
      { name: 'bookId', weight: 4.0 },
      { name: '_shelfSerial', weight: 4.0 },
      { name: 'bookName', weight: 3.5 },
      { name: 'ddcNumber', weight: 3.0 },
      { name: 'callNumber', weight: 3.0 },
      { name: 'author', weight: 2.5 },
      { name: '_transliteration', weight: 2.5 },
      { name: '_ddcKeywords', weight: 2.0 },
      { name: 'category', weight: 1.5 },
      { name: 'publisher', weight: 1.2 },
      { name: 'description', weight: 0.8 }
    ],
    threshold: 0.45,       // Ideal balance for fuzzy typo tolerance without false positives
    ignoreLocation: true,  // Search whole string regardless of match position
    findAllMatches: true,
    minMatchCharLength: 1
  };

  const fuse = new Fuse(enrichedBooks, options);
  
  // Try exact matches first for codes (e.g. accession numbers or call numbers or direct exact titles)
  const exactMatches = enrichedBooks.filter(item => {
    const term = decodedQuery;
    return (
      item.accessionNumber.toLowerCase() === term ||
      item.bookId.toLowerCase() === term ||
      item.ddcNumber.toLowerCase() === term ||
      item.callNumber.toLowerCase() === term ||
      item._shelfSerial === term
    );
  });

  const fuseResults = fuse.search(expandedQuery).map(res => res.item);
  
  // Merge results, giving exact matches top priority
  const mergedResults = [...exactMatches];
  const exactSet = new Set(exactMatches.map(m => m.bookId));
  
  for (const item of fuseResults) {
    if (!exactSet.has(item.bookId)) {
      mergedResults.push(item);
    }
  }

  return mergedResults.map(item => item.book);
}

/**
 * Converts a base64 string to a durable, secure, high-performance Blob URL.
 * Bypasses pop-up issues and browser constraints on extremely large Data URLs.
 */
export function base64ToBlobUrl(base64Data: string, contentType: string = 'application/pdf'): string {
  if (!base64Data) return '';
  // If it's already a standard web address URL, return it as-is
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }
  
  let base64 = base64Data;
  if (base64Data.includes(';base64,')) {
    base64 = base64Data.split(';base64,')[1];
  }
  
  try {
    const sliceSize = 1024;
    const byteCharacters = atob(base64.trim());
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: contentType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Error converting base64 to Blob URL:", err);
    return base64Data;
  }
}

