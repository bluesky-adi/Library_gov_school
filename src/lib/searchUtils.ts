/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Fuse from 'fuse.js';
import { Book } from '../types';
import { getDisplayShelfNumber } from './shelfUtils';

export const HINGLISH_MAP: { [key: string]: string } = {
  "itihas": "इतिहास", "itihaas": "इतिहास", "history": "इतिहास", "historical": "इतिहास",
  "vigyan": "विज्ञान", "vijnan": "विज्ञान", "science": "विज्ञान", "scienc": "विज्ञान",
  "ganit": "गणित", "maths": "गणित", "math": "गणित", "mathematics": "गणित", "ganitha": "गणित",
  "bhugol": "भूगोल", "geography": "भूगोल", "geograpy": "भूगोल", "geo": "भूगोल",
  "rasayan": "रसायन", "chemistry": "रसायन", "rasayanik": "रसायन",
  "bhautiki": "भौतिकी", "physics": "भौतिकी", "bhautik": "भौतिकी",
  "samajik": "सामाजिक", "social": "सामाजिक", "civics": "नागरिक शास्त्र", "nagarik": "नागरिक",
  "hindi": "हिन्दी", "hindee": "हिन्दी", "hind": "हिन्दी",
  "dinkar": "दिनकर", "ramdhari": "रामधारी",
  "rashmirathi": "रश्मिरथी",
  "godhuli": "गोधूलि",
  "bseb": "बिहार", "patna": "पटना", "bihar": "बिहार",
  "shri": "श्री", "pustak": "पुस्तक",
  "upanyas": "उपन्यास", "katha": "कथा",
  "vyakaran": "व्याकरण", "grammar": "व्याकरण",
  "ncert": "एनसीईआरटी",
  "premchand": "प्रेमचंद", "munshi": "मुंशी",
  "pathya": "पाठ्य", "shiksha": "शिक्षा",
  "sanskrut": "संस्कृत", "sanskrit": "संस्कृत", "sanskrith": "संस्कृत",
  "english": "अंग्रेजी", "angreji": "अंग्रेजी", "angrezi": "अंग्रेजी",
  "urdu": "उर्दू",
  "raajneeti": "राजनीति", "rajniti": "राजनीति", "polscience": "राजनीति", "politics": "राजनीति",
  "arthashastra": "अर्थशास्त्र", "economics": "अर्थशास्त्र", "econ": "अर्थशास्त्र",
  "pariksha": "परीक्षा", "exam": "परीक्षा",
  "kavita": "कविता", "poem": "कविता", "poetry": "कविता",
  "kahani": "कहानी", "story": "कहानी", "stories": "कहानी",
  "jivan": "जीवनी", "jeevani": "जीवनी", "biography": "जीवनी",
  "sahitya": "साहित्य", "literature": "साहित्य",
  "natak": "नाटक", "drama": "नाटक", "play": "नाटक",
  "nibandh": "निबंध", "essay": "निबंध",
  "computer": "कंप्यूटर", "sanganak": "संगणक", "cyber": "कंप्यूटर"
};

// Rich mapping of search term synonyms for cross-domain discovery (e.g. fiction <-> literature/story/novel)
export const SYNONYM_MAP: { [key: string]: string[] } = {
  "fiction": ["fiction", "novel", "novels", "story", "stories", "katha", "upanyas", "literature", "sahitya", "800", "kahani", "tales", "prose", "fictions", "dramas", "play", "फिक्शन", "उपन्यास", "कथा", "साहित्य"],
  "novel": ["novel", "novels", "upanyas", "fiction", "story", "katha", "literature", "sahitya", "800", "kahani", "उपन्यास", "फिक्शन"],
  "novels": ["novel", "novels", "upanyas", "fiction", "story", "katha", "literature", "sahitya", "800", "kahani", "उपन्यास"],
  "story": ["story", "stories", "kahani", "katha", "fiction", "novel", "literature", "sahitya", "800", "tales", "कहानी", "कथा"],
  "stories": ["story", "stories", "kahani", "katha", "fiction", "novel", "literature", "sahitya", "800", "tales", "कहानी", "कथा"],
  "literature": ["literature", "sahitya", "fiction", "novel", "story", "poetry", "poem", "drama", "800", "essays", "prose", "साहित्य", "कविता", "नाटक"],
  "sahitya": ["literature", "sahitya", "fiction", "novel", "story", "poetry", "kavita", "800", "साहित्य"],
  "upanyas": ["upanyas", "novel", "fiction", "story", "katha", "800", "उपन्यास"],
  "katha": ["katha", "story", "stories", "fiction", "novel", "kahani", "800", "कथा"],
  "science": ["science", "vigyan", "vijnan", "physics", "chemistry", "biology", "500", "600", "विज्ञान", "भौतिकी", "रसायन", "जीव विज्ञान"],
  "vigyan": ["science", "vigyan", "physics", "chemistry", "biology", "500", "विज्ञान"],
  "history": ["history", "itihas", "itihaas", "historical", "900", "biography", "इतिहास"],
  "itihas": ["history", "itihas", "historical", "900", "इतिहास"],
  "geography": ["geography", "bhugol", "geo", "geograpy", "900", "भूगोल"],
  "bhugol": ["geography", "bhugol", "geo", "900", "भूगोल"],
  "math": ["math", "maths", "mathematics", "ganit", "geometry", "algebra", "500", "गणित"],
  "maths": ["math", "maths", "mathematics", "ganit", "geometry", "algebra", "500", "गणित"],
  "mathematics": ["math", "maths", "mathematics", "ganit", "500", "गणित"],
  "ganit": ["math", "maths", "mathematics", "ganit", "500", "गणित"],
  "physics": ["physics", "bhautiki", "bhautik", "science", "500", "530", "भौतिकी"],
  "chemistry": ["chemistry", "rasayan", "rasayanik", "science", "500", "540", "रसायन"],
  "biology": ["biology", "jeev", "bio", "science", "500", "570", "जीव विज्ञान"],
  "civics": ["civics", "nagarik", "polscience", "social", "300", "320", "नागरिक शास्त्र"],
  "economics": ["economics", "arthashastra", "econ", "social", "300", "330", "अर्थशास्त्र"],
  "politics": ["politics", "political", "rajniti", "raajneeti", "social", "300", "320", "राजनीति"],
  "social": ["social", "samajik", "civics", "economics", "300", "सामाजिक"],
  "hindi": ["hindi", "hindee", "हिन्दी", "हिंदी", "sahitya", "400", "800"],
  "english": ["english", "angreji", "angrezi", "अंग्रेजी", "अंग्रेज़ी", "400", "800"],
  "sanskrit": ["sanskrit", "sanskrut", "संस्कृत", "400"],
  "computer": ["computer", "sanganak", "cyber", "computing", "000", "005", "कंप्यूटर", "संगणक"]
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
  "800": "literature fiction novel novels stories poems drama essays poetry katha upanyas kahani tales prose 800",
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
 * Modern, high-performance, intelligent smart search engine.
 * Combines exact code matches, multi-token synonym matching, partial substring matching,
 * and Fuse.js fuzzy matching to guarantee human-friendly, accurate search results.
 */
export function searchBooksSmart(
  books: Book[], 
  query: string, 
  categorySerialsMap?: Map<string, number>
): Book[] {
  if (!query || !query.trim()) return books;
  
  const rawQuery = query.toLowerCase().trim();
  const normalizedQuery = rawQuery.replace(/[\s\-_]+/g, ''); // Compact spacing e.g. "rashmi rathi" -> "rashmirathi"
  
  // 1. Expand query tokens with Hinglish & Synonym dictionaries
  const rawTokens = rawQuery.split(/[\s,.\-/]+/).filter(t => t.length > 0);
  const searchTermsSet = new Set<string>();
  
  rawTokens.forEach(token => {
    searchTermsSet.add(token);
    
    // Check Hinglish
    if (HINGLISH_MAP[token]) {
      searchTermsSet.add(HINGLISH_MAP[token].toLowerCase());
    }
    for (const [eng, hin] of Object.entries(HINGLISH_MAP)) {
      if (token === hin || hin.toLowerCase() === token) {
        searchTermsSet.add(eng);
      }
    }
    
    // Check Synonyms
    if (SYNONYM_MAP[token]) {
      SYNONYM_MAP[token].forEach(syn => searchTermsSet.add(syn.toLowerCase()));
    }
    for (const [key, synList] of Object.entries(SYNONYM_MAP)) {
      if (synList.includes(token)) {
        searchTermsSet.add(key.toLowerCase());
        synList.forEach(s => searchTermsSet.add(s.toLowerCase()));
      }
    }
  });

  const expandedTerms = Array.from(searchTermsSet);
  const expandedQueryStr = expandedTerms.join(' ');

  // 2. Prepare enriched searchable records
  const enrichedBooks = books.map(book => {
    const bookDdc = book.ddcNumber || book.callNumber || "";
    const century = getCenturyClass(bookDdc);
    const ddcKeywords = century ? (DDC_CLASS_SUBJECTS[century] || "") : "";
    const ddcCatName = getDdcCategoryName(bookDdc);
    const translit = getTransliterationKeywords(book);
    const catSerial = categorySerialsMap ? String(categorySerialsMap.get(book.bookId) || "") : "";
    const displayShelf = getDisplayShelfNumber(book, categorySerialsMap, { prefix: "Shelf #" }).toLowerCase();

    const name = (book.bookName || "").toLowerCase();
    const nameCompact = name.replace(/[\s\-_]+/g, '');
    const author = (book.author || "").toLowerCase();
    const authorCompact = author.replace(/[\s\-_]+/g, '');
    const category = (book.category || "").toLowerCase();
    const publisher = (book.publisher || "").toLowerCase();
    const description = (book.description || "").toLowerCase();
    const accessionNumber = (book.accessionNumber || "").toLowerCase();
    const callNumber = (book.callNumber || "").toLowerCase();
    const bookNumber = (book.bookNumber || "").toLowerCase();
    const ddcNumber = (book.ddcNumber || "").toLowerCase();
    const anyBook = book as any;
    const remarks = (book.remarks || "").toLowerCase();
    const shelfNumber = (book.shelfNumber || "").toLowerCase();
    const isbn = String(anyBook.isbn || "").toLowerCase();
    const language = String(anyBook.language || "").toLowerCase();
    const subject = String(anyBook.subject || "").toLowerCase();
    const classNum = String(anyBook.classNumber || anyBook.class || "").toLowerCase();

    // Combined blob for fast substring checks
    const fullSearchBlob = `${name} ${author} ${category} ${publisher} ${description} ${accessionNumber} ${callNumber} ${bookNumber} ${ddcNumber} ${remarks} ${shelfNumber} ${displayShelf} ${isbn} ${language} ${subject} ${classNum} ${ddcCatName.toLowerCase()} ${ddcKeywords} ${translit} ${catSerial}`.toLowerCase();

    return {
      book,
      bookId: book.bookId,
      name,
      nameCompact,
      author,
      authorCompact,
      category,
      publisher,
      description,
      accessionNumber,
      callNumber,
      bookNumber,
      ddcNumber,
      remarks,
      shelfNumber,
      displayShelf,
      isbn,
      language,
      subject,
      classNum,
      ddcCatName: ddcCatName.toLowerCase(),
      _ddcKeywords: ddcKeywords,
      _transliteration: translit,
      _shelfSerial: catSerial,
      fullSearchBlob
    };
  });

  // 3. Configure Fuse.js for fuzzy typo tolerance
  const fuseOptions = {
    keys: [
      { name: 'accessionNumber', weight: 4.5 },
      { name: 'bookId', weight: 4.0 },
      { name: '_shelfSerial', weight: 4.0 },
      { name: 'displayShelf', weight: 3.8 },
      { name: 'shelfNumber', weight: 3.8 },
      { name: 'name', weight: 3.5 },
      { name: 'ddcNumber', weight: 3.0 },
      { name: 'callNumber', weight: 3.0 },
      { name: 'isbn', weight: 3.0 },
      { name: 'author', weight: 2.5 },
      { name: '_transliteration', weight: 2.5 },
      { name: '_ddcKeywords', weight: 2.2 },
      { name: 'category', weight: 2.0 },
      { name: 'subject', weight: 2.0 },
      { name: 'ddcCatName', weight: 1.8 },
      { name: 'publisher', weight: 1.2 },
      { name: 'description', weight: 0.8 },
      { name: 'remarks', weight: 0.8 }
    ],
    threshold: 0.5,
    ignoreLocation: true,
    findAllMatches: true,
    minMatchCharLength: 1
  };

  const fuse = new Fuse(enrichedBooks, fuseOptions);
  const fuseResults = fuse.search(expandedQueryStr);
  
  const fuseScoreMap = new Map<string, number>();
  fuseResults.forEach(res => {
    // Fuse score ranges from 0 (perfect match) to 1 (poor match)
    const scoreVal = (1 - (res.score || 0)) * 100;
    fuseScoreMap.set(res.item.bookId, scoreVal);
  });

  // Check if query is looking for a shelf e.g. "shelf 8", "shelf #8", "s-08", "s8", "shelf8"
  const shelfQueryMatch = rawQuery.match(/^(?:shelf\s*#?|s\-?)\s*(\d+)$/i);
  const shelfTargetNum = shelfQueryMatch ? shelfQueryMatch[1].replace(/^0+/, '') : null;

  // 4. Multi-level scoring and ranking
  const scoredList: { book: Book; score: number }[] = [];

  for (const item of enrichedBooks) {
    let score = 0;

    // A. Direct Code/ID/Shelf Matches (highest priority)
    if (
      item.accessionNumber === rawQuery ||
      item.bookId.toLowerCase() === rawQuery ||
      item.ddcNumber === rawQuery ||
      item.callNumber === rawQuery ||
      item.isbn === rawQuery ||
      item._shelfSerial === rawQuery ||
      item.shelfNumber === rawQuery ||
      item.displayShelf === rawQuery
    ) {
      score += 1000;
    } else if (
      item.accessionNumber.includes(rawQuery) ||
      item.bookId.toLowerCase().includes(rawQuery) ||
      item.callNumber.includes(rawQuery) ||
      item.isbn.includes(rawQuery)
    ) {
      score += 300;
    }

    // Smart Shelf Match
    if (shelfTargetNum) {
      const itemShelfNum = item.shelfNumber.replace(/\D/g, '').replace(/^0+/, '');
      const itemSerialNum = item._shelfSerial.replace(/^0+/, '');
      if (itemShelfNum === shelfTargetNum || itemSerialNum === shelfTargetNum) {
        score += 850;
      }
    }

    // B. Direct Name / Author match (with compact spacing tolerance)
    if (item.name === rawQuery || item.nameCompact === normalizedQuery) {
      score += 500;
    } else if (item.name.includes(rawQuery) || item.nameCompact.includes(normalizedQuery)) {
      score += 200;
    }

    if (item.author.includes(rawQuery) || item.authorCompact.includes(normalizedQuery)) {
      score += 150;
    }

    // C. Term & Synonym token inclusions
    for (const term of expandedTerms) {
      if (!term || term.length < 2) continue;

      if (item.name.includes(term)) score += 80;
      if (item.category.includes(term) || item.ddcCatName.includes(term) || item.subject.includes(term)) score += 70;
      if (item.author.includes(term)) score += 60;
      if (item._ddcKeywords.includes(term)) score += 50;
      if (item._transliteration.includes(term)) score += 40;
      if (item.description.includes(term) || item.publisher.includes(term) || item.remarks.includes(term)) score += 20;
    }

    // D. Add Fuse Fuzzy Score
    const fuzzyScore = fuseScoreMap.get(item.bookId) || 0;
    if (fuzzyScore > 20) {
      score += fuzzyScore;
    }

    if (score > 0) {
      scoredList.push({ book: item.book, score });
    }
  }

  // Sort by score descending
  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.map(entry => entry.book);
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

export interface DdcColor {
  bg: string;
  text: string;
  border: string;
  hex: string;
  textColorHex: string;
}

export function getDdcColor(ddcNumStr: string | undefined | null): DdcColor {
  const ddcDefaults: DdcColor = {
    bg: 'bg-slate-500',
    text: 'text-white',
    border: 'border-slate-650',
    hex: '#B0BEC5',
    textColorHex: '#000000'
  };
  
  if (!ddcNumStr) return ddcDefaults;
  const trimStr = String(ddcNumStr).trim();
  if (trimStr === "") return ddcDefaults;
  
  const numMatch = trimStr.match(/^\d+/);
  if (!numMatch) return ddcDefaults;
  
  const num = parseInt(numMatch[0], 10);
  if (isNaN(num)) return ddcDefaults;
  
  const mainClass = Math.floor(num / 100) * 100;
  
  switch(mainClass) {
    case 0:
      return {
        bg: 'bg-[#B0BEC5]',
        text: 'text-[#000000]',
        border: 'border-[#90A4AE]',
        hex: '#B0BEC5', // Light Gray
        textColorHex: '#000000'
      };
    case 100:
      return {
        bg: 'bg-[#7E57C2]',
        text: 'text-white',
        border: 'border-[#5E35B1]',
        hex: '#7E57C2', // Purple
        textColorHex: '#FFFFFF'
      };
    case 200:
      return {
        bg: 'bg-[#8D6E63]',
        text: 'text-white',
        border: 'border-[#6D4C41]',
        hex: '#8D6E63', // Brown
        textColorHex: '#FFFFFF'
      };
    case 300:
      return {
        bg: 'bg-[#E53935]',
        text: 'text-white',
        border: 'border-[#C62828]',
        hex: '#E53935', // Crimson Red
        textColorHex: '#FFFFFF'
      };
    case 400:
      return {
        bg: 'bg-[#FB8C00]',
        text: 'text-[#000000]',
        border: 'border-[#EF6C00]',
        hex: '#FB8C00', // Orange
        textColorHex: '#000000'
      };
    case 500:
      return {
        bg: 'bg-[#43A047]',
        text: 'text-white',
        border: 'border-[#2E7D32]',
        hex: '#43A047', // Emerald Green
        textColorHex: '#FFFFFF'
      };
    case 600:
      return {
        bg: 'bg-[#1E88E5]',
        text: 'text-white',
        border: 'border-[#1565C0]',
        hex: '#1E88E5', // Royal Blue
        textColorHex: '#FFFFFF'
      };
    case 700:
      return {
        bg: 'bg-[#EC407A]',
        text: 'text-white',
        border: 'border-[#C2185B]',
        hex: '#EC407A', // Pink
        textColorHex: '#FFFFFF'
      };
    case 800:
      return {
        bg: 'bg-[#FDD835]',
        text: 'text-[#000000]',
        border: 'border-[#FBC02D]',
        hex: '#FDD835', // Golden Yellow
        textColorHex: '#000000'
      };
    case 900:
      return {
        bg: 'bg-[#00897B]',
        text: 'text-white',
        border: 'border-[#00695C]',
        hex: '#00897B', // Teal
        textColorHex: '#FFFFFF'
      };
    default:
      return ddcDefaults;
  }
}


