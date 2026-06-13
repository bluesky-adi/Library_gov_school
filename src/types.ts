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
}

export interface Student {
  name: string;
  rollNumber: number;
  dob: string; // YYYY-MM-DD
  class: string; // e.g. "10", "11", "9"
  section: string; // e.g. "A", "B", "C"
}

export interface BorrowRequest {
  id: string;
  studentName: string;
  rollNumber: number;
  bookId: string;
  bookName: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
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
  dueDate: string; // due date tracker (issueDate + 14 days)
  returnDate?: string; // If returned, has date
  status: 'Issued' | 'Returned';
}

export interface AppState {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  currentRole: UserRole | null;
  loggedInStudent?: Student;
}
