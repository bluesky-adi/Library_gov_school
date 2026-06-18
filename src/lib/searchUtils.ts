/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  "000": "general information computer science computing",
  "100": "philosophy psychology",
  "200": "religion spirituality",
  "300": "social sciences civics economics sociology",
  "400": "language grammar sanskrit english hindi languages",
  "500": "science mathematics biology math geometry physics chemistry",
  "600": "technology engineering medical health agriculture applied science",
  "700": "arts recreation sports games music",
  "800": "literature poems drama stories essays novels",
  "900": "history geography travel maps biography"
};

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function calculateSpellingSimilarity(q: string, t: string): number {
  const dist = getLevenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  return maxLen > 0 ? (maxLen - dist) / maxLen : 0;
}

/**
 * Smart search engine that expands Hinglish to Hindi, matches metadata,
 * handles fuzzy spelling corrections, interprets DDC ranges, and processes Category Serials.
 */
export function searchBooksSmart(
  books: Book[], 
  query: string, 
  categorySerialsMap?: Map<string, number>
): Book[] {
  if (!query || !query.trim()) return books;
  const decodedQuery = query.toLowerCase().trim();
  
  // Dynamic fallback for Category Serial Numbering Map if not supplied
  let serialsMap = categorySerialsMap;
  if (!serialsMap) {
    serialsMap = new Map<string, number>();
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
        serialsMap!.set(b.bookId, idx + 1);
      });
    }
  }

  // 1. Expand search tokens
  const queryTokens = decodedQuery.split(/[\s,.\-/]+/).filter(t => t.length > 0);
  if (queryTokens.length === 0) return books;

  // Enhance tokens with Hinglish expansions
  const expandedTokens: string[] = [];
  for (const token of queryTokens) {
    expandedTokens.push(token);
    // Direct maps
    if (HINGLISH_MAP[token]) {
      expandedTokens.push(HINGLISH_MAP[token].toLowerCase());
    }
    // Reverse maps
    for (const [eng, hin] of Object.entries(HINGLISH_MAP)) {
      if (token === hin || hin.toLowerCase() === token) {
        expandedTokens.push(eng);
      }
    }
  }

  const finalEnhancedTokens = Array.from(new Set(expandedTokens));

  // 2. Score each book on closeness to query
  const scoredBooks = books.map(book => {
    let score = 0;
    
    const name = (book.bookName || "").toLowerCase();
    const author = (book.author || "").toLowerCase();
    const publisher = (book.publisher || "").toLowerCase();
    const category = (book.category || "").toLowerCase();
    const accession = (book.accessionNumber || "").toLowerCase();
    const callNum = (book.callNumber || "").toLowerCase();
    const bookNum = (book.bookNumber || "").toLowerCase();
    const desc = (book.description || "").toLowerCase();
    const bookId = (book.bookId || "").toLowerCase();
    
    // Retrieve Category Serial Number if available
    const catSerial = serialsMap ? String(serialsMap.get(book.bookId)) : "";

    // Exact string matches on complete query string
    if (name.includes(decodedQuery)) score += 120;
    if (author.includes(decodedQuery)) score += 90;
    if (category.includes(decodedQuery)) score += 60;
    if (accession === decodedQuery || accession.includes(decodedQuery)) score += 150; // High correlation
    if (callNum === decodedQuery || callNum.includes(decodedQuery)) score += 130;
    if (bookNum === decodedQuery || bookNum.includes(decodedQuery)) score += 110;
    if (catSerial && catSerial === decodedQuery) score += 140; // Perfect match on category shelf number
    if (bookId === decodedQuery) score += 150;

    // Checks on each enhanced token individually
    for (const token of finalEnhancedTokens) {
      // 1. Precise match boosts
      if (accession === token || accession.includes(token)) score += 90;
      if (callNum === token || callNum.includes(token)) score += 60;
      if (bookNum === token || bookNum.includes(token)) score += 65;
      if (catSerial && catSerial === token) score += 75;

      // Substring matches for expanded tokens
      if (name.includes(token)) score += 75;
      if (author.includes(token)) score += 45;
      if (publisher.includes(token)) score += 20;
      if (category.includes(token)) score += 30;
      if (bookId.includes(token)) score += 40;

      // Class 100-999 / DDC numbers checks
      const isDdcCode = /^[0-9]00$/.test(token);
      if (isDdcCode) {
        const century = token.charAt(0);
        const matchesCentury = callNum.startsWith(century);
        const subjectDescription = DDC_CLASS_SUBJECTS[token] || "";
        const matchesCategory = subjectDescription.split(" ").some(kw => category.includes(kw));
        if (matchesCentury) score += 150;
        if (matchesCategory) score += 100;
      }

      // 2. Title word matches / Fuzzy typo tolerance
      const nameWords = name.split(/[\s,.\-/]+/).filter(w => w.length > 1);
      for (const w of nameWords) {
        if (w === token) {
          score += 50;
        } else if (w.includes(token) || token.includes(w)) {
          score += 30;
        } else {
          // Fuzzy distance
          const sim = calculateSpellingSimilarity(token, w);
          if (sim >= 0.65) {
            score += Math.floor(sim * 35);
          }
        }
      }

      // 3. Author word matches / Fuzzy typo tolerance
      const authorWords = author.split(/[\s,.\-/]+/).filter(w => w.length > 1);
      for (const w of authorWords) {
        if (w === token) {
          score += 40;
        } else if (w.includes(token) || token.includes(w)) {
          score += 20;
        } else {
          const sim = calculateSpellingSimilarity(token, w);
          if (sim >= 0.70) {
            score += Math.floor(sim * 25);
          }
        }
      }

      // 4. Publisher word matches
      if (publisher.includes(token)) score += 20;
      else {
        const sim = calculateSpellingSimilarity(token, publisher);
        if (sim >= 0.75) score += 15;
      }

      // 5. Category word/DDC checks
      if (category.includes(token)) score += 25;
      if (desc.includes(token)) score += 10;
    }

    return { book, score };
  });

  // Filter books with a non-zero matching score, then sort from highest to lowest score
  const matches = scoredBooks.filter(item => item.score > 0);
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const idA = parseInt(a.book.bookId.replace(/\D/g, ''), 10) || 0;
    const idB = parseInt(b.book.bookId.replace(/\D/g, ''), 10) || 0;
    if (idA !== idB) return idA - idB;
    return a.book.bookId.localeCompare(b.book.bookId, undefined, { numeric: true });
  });

  return matches.map(item => item.book);
}
