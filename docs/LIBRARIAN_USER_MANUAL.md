# Librarian User Manual & Operations Guide

**Institution:** PM SHRI Ramdiri +2 High School, Begusarai, Bihar  
**System:** Ramdiri Library Portal  
**Target Audience:** School Librarians, Assistant Librarians, IT Coordinators  
**Version:** v1.1.0

---

## 1. Getting Started & Logging In

1. Open the Ramdiri Library Portal in Google Chrome or Microsoft Edge.
2. Click **Librarian Login** at the top right of the homepage.
3. Enter your Username and Password provided by the school administrator.
4. Upon successful authentication, you will enter the **Librarian Control Center**.

---

## 2. Managing Book Catalog & Inventory

### Adding a Single Book
1. Go to **Book Catalog Management**.
2. Click **Add New Book**.
3. Fill in the required fields:
   - **Book Title** (Supports both Hindi and English)
   - **Author**
   - **Publisher**
   - **Accession Number** (Unique ID e.g. `CS-001`)
   - **Call Number** (e.g. `823.91 TAN`)
   - **Book Number** (e.g. `B-014`)
   - **Shelf Number** (e.g. `#08`)
   - **Total Copies Available**
4. Click **Save Book Record**.

### Bulk Importing Books
1. Click **Bulk Excel / CSV Import**.
2. Download the sample CSV template.
3. Upload your populated spreadsheet. The system will auto-index all records instantly.

---

## 3. Printing QR Stickers (Oddy ST-24 Standard)

The portal features an integrated sticker generator calibrated specifically for standard **Oddy ST-24 (64 mm × 34 mm, 3 Columns × 8 Rows)** label sheets.

### Printing Custom Accession Ranges
1. Go to **QR Code & Sticker Generator**.
2. Choose **Print Custom Accession Range**.
3. Enter Start Accession (e.g. `CS-001`) and End Accession (e.g. `CS-024`).
4. Click **Generate & Download Sticker Sheet (PDF)**.
5. Load Oddy ST-24 label sheets into your printer.
6. **IMPORTANT PRINTER SETTING:** In the PDF print dialog, set **Page Scaling / Scale** to **100% (Actual Size)**. Do NOT select "Fit to Page".

### Sticker Label Layout Verification
Each printed sticker displays:
```
ACC NO -   CS-001
CALL NO -  823.91 TAN
BOOK NO -  B-014
SHELF -    #08
           [ QR CODE ]
```

---

## 4. Issuing and Returning Books (Walk-In counter)

### Issuing a Book to a Student
1. Go to **Walk-In Counter (Issue / Return)**.
2. Select or scan the **Student Roll / ID**.
3. Scan the **QR Code** on the book sticker or type the Accession Number.
4. Set the **Due Date** (Default: 14 days).
5. Click **Confirm Issue**.

### Returning a Borrowed Book
1. Go to **Walk-In Counter (Issue / Return)** -> **Active Loan Logs**.
2. Scan the book QR code or click **Return Book** next to the student's entry.
3. If returned past the due date, the system auto-calculates the fine amount.
4. Click **Mark Returned**. The book's available copy count automatically increments.

---

## 5. Handling Online Student Reservation Requests

1. Navigate to **Reservation Requests**.
2. Review pending requests submitted by students.
3. Click **Approve** to hold the book for the student, or **Reject** with an optional note.

---

## 6. Digital Study Materials & Notice Board

1. Navigate to **Digital Resources Management**.
2. Upload syllabus PDFs, previous year question papers, or notes.
3. Students can access and download these resources anytime from their student portal.

---

## 7. Frequently Asked Questions (FAQ)

- **Q: What if a QR sticker gets damaged?**
  - A: Re-generate and print a single sticker anytime from the **QR & Sticker Generator** tab using its Accession Number.
- **Q: Can I search books in Devanagari Hindi?**
  - A: Yes! The search engine natively indexes Devanagari titles (e.g., "गोधूलि"), English titles, authors, subjects, and shelf numbers.
