/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { translations } from '../localization';
import { UserRole, Book, Student, BorrowRequest, BookIssueLog, LibraryAuditLog } from '../types';
import StudentModule from './StudentModule';
import LibrarianModule from './LibrarianModule';
import ErrorBoundary from './ErrorBoundary';
import { Shield, Key, AlertTriangle, BookOpen } from 'lucide-react';

interface LibraryPortalProps {
  currentRole: UserRole | 'Guest';
  loggedInStudent: Student | null;
  currentLang: 'EN' | 'HI';
  books: Book[];
  students: Student[];
  requests: BorrowRequest[];
  issueLogs: BookIssueLog[];
  auditLogs?: LibraryAuditLog[];
  onRefreshData?: () => void;
  onAddBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onDeleteBooksBulk: (bookIds: string[]) => void;
  onClearInventory: () => void;
  onApproveRequest: (id: string, dueDate?: string) => void;
  onRejectRequest: (id: string) => void;
  onCancelRequest: (id: string) => Promise<boolean>;
  onReturnBook: (logId: string) => void;
  onImportBooksExcel: (imported: Book[]) => void;
  onImportStudentsExcel: (imported: Student[]) => void;
  onAddStudent: (student: Student) => Promise<boolean>;
  onEditStudent: (student: Student) => Promise<boolean>;
  onDeleteStudent: (studentId: string) => Promise<boolean>;
  onDeleteStudentsBulk?: (studentIds: string[]) => Promise<boolean>;
  onClearStudentsRegistry?: () => Promise<boolean>;
  onBackupDatabase?: () => Promise<void>;
  onRestoreDatabase?: (payload: any) => Promise<boolean>;
  onAddRequest: (req: BorrowRequest) => void;
  onTriggerLoginClick: () => void;
  onResetDatabase: () => void;
  loggedInName?: string;
  onUpdateLoggedInName?: (newName: string) => void;
  onBulkIssue?: (payload: {
    rollNumber: string;
    class: string;
    section: string;
    studentName: string;
    bookIds: string[];
    dueDate: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function LibraryPortal({
  currentRole,
  loggedInStudent,
  currentLang,
  books,
  students,
  requests,
  issueLogs,
  auditLogs,
  onRefreshData,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onDeleteBooksBulk,
  onClearInventory,
  onApproveRequest,
  onRejectRequest,
  onCancelRequest,
  onReturnBook,
  onImportBooksExcel,
  onImportStudentsExcel,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onDeleteStudentsBulk,
  onClearStudentsRegistry,
  onBackupDatabase,
  onRestoreDatabase,
  onAddRequest,
  onTriggerLoginClick,
  onResetDatabase,
  loggedInName,
  onUpdateLoggedInName,
  onBulkIssue
}: LibraryPortalProps) {
  const t = translations[currentLang];

  if (currentRole === 'Guest') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-fade-in" id="portal-guest-fallback">
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            {currentLang === 'EN' ? "Authentication Required" : "प्रवेश अनुज्ञा अपेक्षित"}
          </h2>
          <p className="text-xs text-slate-550 leading-normal">
            {currentLang === 'EN' 
              ? "You must log in to the system either as a Student (Roll + DOB) or Librarian to view personalized account records."
              : "व्यक्तिगत खाते के विवरण देखने के लिए आपको छात्र (रॉल + जन्म तिथि) या पुस्तकालयाध्यक्ष के रूप में लॉगिन करना होगा।"}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onTriggerLoginClick}
            className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Key className="w-4 h-4 text-slate-950" />
            <span>{currentLang === 'EN' ? "Launch Security Login" : "सुरक्षा लॉगिन शुरू करें"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="portal-router-root">
      {currentRole === 'Student' && loggedInStudent ? (
        <ErrorBoundary fallbackTitle="Student Reading Dashboard Error">
          <StudentModule
            books={books}
            requests={requests}
            onAddRequest={onAddRequest}
            onCancelRequest={onCancelRequest}
            currentLang={currentLang}
            loggedInStudent={loggedInStudent}
            issueLogs={issueLogs}
          />
        </ErrorBoundary>
      ) : currentRole === 'Librarian' ? (
        <ErrorBoundary fallbackTitle="Librarian Dashboard Error">
          <LibrarianModule
            books={books}
            students={students}
            requests={requests}
            issueLogs={issueLogs}
            auditLogs={auditLogs || []}
            onRefreshInputLogs={onRefreshData}
            onAddBook={onAddBook}
            onEditBook={onEditBook}
            onDeleteBook={onDeleteBook}
            onDeleteBooksBulk={onDeleteBooksBulk}
            onClearInventory={onClearInventory}
            onApproveRequest={onApproveRequest}
            onRejectRequest={onRejectRequest}
            onCancelRequest={onCancelRequest}
            onReturnBook={onReturnBook}
            onImportBooksExcel={onImportBooksExcel}
            onImportStudentsExcel={onImportStudentsExcel}
            onAddStudent={onAddStudent}
            onEditStudent={onEditStudent}
            onDeleteStudent={onDeleteStudent}
            onDeleteStudentsBulk={onDeleteStudentsBulk}
            onClearStudentsRegistry={onClearStudentsRegistry}
            onBackupDatabase={onBackupDatabase}
            onRestoreDatabase={onRestoreDatabase}
            onAddRequest={onAddRequest}
            onBulkIssue={onBulkIssue}
            currentLang={currentLang}
            loggedInName={loggedInName}
            onUpdateLoggedInName={onUpdateLoggedInName}
          />
        </ErrorBoundary>
      ) : (
        <div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-650 mx-auto" />
          <p className="font-extrabold text-slate-900">Security Exception Error</p>
          <p className="text-xs text-slate-600">The current security state is corrupted. Please log out and sign back in.</p>
        </div>
      )}
    </div>
  );
}
