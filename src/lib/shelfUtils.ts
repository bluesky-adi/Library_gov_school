import { Book } from '../types';

/**
 * Builds a Map of bookId -> category-wise serial index (1-based).
 * Groups books by category, sorts each group by accessionNumber/bookId ascending,
 * and assigns a sequential 1-based serial index within each category stack.
 */
export function buildCategorySerialsMap(books: Book[]): Map<string, number> {
  const map = new Map<string, number>();
  if (!books || books.length === 0) return map;

  const groups: { [cat: string]: Book[] } = {};

  books.forEach(b => {
    const cat = (b.category || "General").trim();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  });

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
}

/**
 * Computes the single source of truth for display Shelf Number across the entire system.
 * 
 * Logic:
 * 1. If book.shelfNumber exists, is non-empty, and is not "Not Assigned" or "—", return book.shelfNumber.trim().
 * 2. Otherwise, fall back to the category-wise serial number (e.g. "Shelf #1", "Shelf #2", etc.).
 */
export function getDisplayShelfNumber(
  book?: Book | null,
  categorySerialsMap?: Map<string, number>,
  options: { prefix?: string; rawNumberOnly?: boolean } = {}
): string {
  if (!book) return options.rawNumberOnly ? "1" : (options.prefix !== undefined ? `${options.prefix}1` : "Shelf #1");

  const rawShelf = (book.shelfNumber || "").trim();
  if (rawShelf && rawShelf !== "Not Assigned" && rawShelf !== "—") {
    return rawShelf;
  }

  const serial = categorySerialsMap?.get(book.bookId) || 1;
  if (options.rawNumberOnly) {
    return String(serial);
  }

  const prefix = options.prefix !== undefined ? options.prefix : "Shelf #";
  return `${prefix}${serial}`;
}

/**
 * Normalizes Date of Birth strings to YYYY-MM-DD format suitable for HTML <input type="date">.
 * Handles DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, and invalid formats safely.
 */
export function formatDateForInput(dobStr?: string): string {
  if (!dobStr) return '';
  const trimmed = dobStr.trim();
  if (!trimmed) return '';

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Split by common delimiters: -, /, .
  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    // DD-MM-YYYY -> YYYY-MM-DD
    if (p1.length <= 2 && p3.length === 4) {
      const day = p1.padStart(2, '0');
      const month = p2.padStart(2, '0');
      const year = p3;
      return `${year}-${month}-${day}`;
    }
    // YYYY-MM-DD where month or day might not be padded
    if (p1.length === 4 && p3.length <= 2) {
      const year = p1;
      const month = p2.padStart(2, '0');
      const day = p3.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return trimmed;
}

/**
 * Formats Date of Birth strings into DD-MM-YYYY format for consistent application display.
 * Handles YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, and returns DD-MM-YYYY.
 */
export function formatDobDisplay(dobStr?: string): string {
  if (!dobStr) return '';
  const trimmed = dobStr.trim();
  if (!trimmed) return '';

  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    // YYYY-MM-DD -> DD-MM-YYYY
    if (p1.length === 4 && p3.length <= 2) {
      const year = p1;
      const month = p2.padStart(2, '0');
      const day = p3.padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    // DD-MM-YYYY -> DD-MM-YYYY
    if (p1.length <= 2 && p3.length === 4) {
      const day = p1.padStart(2, '0');
      const month = p2.padStart(2, '0');
      const year = p3;
      return `${day}-${month}-${year}`;
    }
  }

  return trimmed;
}

