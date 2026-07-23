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
  ddcNumber?: string;
  shelfNumber?: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  pdfData?: string; // Base64 representation of PDF
  pdfName?: string; // filename of the uploaded pdf
  expiryDate: string; // YYYY-MM-DD
  visibleTo: 'All' | string; // 'All' or class grade (e.g., '10')
  createdAt: string;
}

export interface Student {
  studentId: string; // Generated: Class-Section-RollNumber (e.g. "10-A-15")
  name: string;
  rollNumber: number;
  dob: string; // DD-MM-YYYY
  class: string; // e.g. "10", "11", "9"
  section: string; // e.g. "A", "B", "C"
  admissionNumber?: string;
  contactNumber?: string;
  pin?: string;
  status?: string;
}

export interface BorrowRequest {
  id: string;
  studentName: string;
  rollNumber: number;
  class?: string;
  section?: string;
  studentId?: string;
  bookId: string;
  bookName: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Hold';
  comment?: string;
}

export interface BookIssueLog {
  id: string;
  studentName: string;
  rollNumber: number;
  class?: string;
  section?: string;
  studentId?: string;
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

export interface Feedback {
  id: string;
  studentId: string;
  studentName: string;
  studentRole?: string;
  role?: string;
  rating: number;
  type: 'General' | 'Bug' | 'Suggestion' | 'Feature Request';
  comment: string;
  reply?: string;
  status: 'Pending' | 'Approved' | 'Resolved' | 'Spam';
  createdAt: string;
  updatedAt?: string;
}

export interface AppState {
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  studyMaterials?: StudyMaterial[];
  auditLogs?: LibraryAuditLog[];
  feedbacks?: Feedback[];
  currentRole: UserRole | null;
  loggedInStudent?: Student;
}

export interface ContactMessage {
  id: string;
  studentName: string;
  class: string;
  section: string;
  rollNumber: number;
  category: 'General Question' | 'Suggestion' | 'Report an Issue' | 'Book Recommendation' | 'Other';
  message: string;
  status: 'Unread' | 'Read';
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientRole: 'Librarian' | 'Student';
  studentId?: string; // empty/null if librarian notification
  title: string;
  message: string;
  icon?: string; // e.g., 'book', 'message', 'alert', 'user', 'feedback', 'success', 'upload'
  status: 'Unread' | 'Read' | 'Archived';
  createdAt: string;
}


