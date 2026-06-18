/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Student' | 'Librarian';

export interface Book {
  bookId: string;
  bookName: string;
  author: string;
  publisher: string;
  category: string;
  description: string;
  totalCopies: number;
  availableCopies: number;
  coverImage?: string; // Opt Google Books / cover or placeholder
  
  // Custom workbook fields preserved from the official library register
  accessionNumber?: string;
  yearOfPublication?: string;
  placeOfPublication?: string;
  editor?: string;
  edition?: string;
  volume?: string;
  pages?: string;
  price?: string;
  callNumber?: string;
  bookNumber?: string;
  source?: string;
  remarks?: string;
  ddcCategory?: string;
}

export interface Student {
  studentId: string; // Generated: Class-Section-RollNumber (e.g. "10-A-15")
  name: string;
  rollNumber: number;
  dob: string; // YYYY-MM-DD
  class: string; // e.g. "10", "11", "9"
  section: string; // e.g. "A", "B", "C"
  pin?: string;
}

export interface BorrowRequest {
  id: string;
  studentName: string;
  rollNumber: number;
  bookId: string;
  bookName: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  comment?: string;
}

export interface BookIssueLog {
  id: string;
  studentName: string;
  rollNumber: number;
  class?: string;
  section?: string;
  bookId: string;
  bookName: string;
  issueDate: string;
  issueTime?: string;
  dueDate: string; // due date tracker
  returnDate?: string; // If returned, has date
  returnTime?: string;
  status: 'Issued' | 'Returned';
}

export interface LibraryAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'Book Issued' | 'Book Returned' | 'Student Added' | 'Student Edited' | 'Student Deleted' | 'Book Added' | 'Book Edited' | 'Book Deleted' | 'Request Cancelled';
  details: string;
}

export interface AppState {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  auditLogs?: LibraryAuditLog[];
  currentRole: UserRole | null;
  loggedInStudent?: Student;
}
