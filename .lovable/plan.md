# Arrange Perth competitor PDFs by event and age category

## What changes
The public "List of Registered Competitors" PDF and the staff "Competition Log PDF" switch from one flat list to a competition draw format:

```text
Geup 9 – Taegeuk 1 Jang
  7-8 Years (1)
    # | Name | Club | Grade
Geup 7 – Taegeuk 2 Jang
  7-8 Years (1)
  ...
```

- **Events** appear in the official event order. Each event starts with a bold heading.
- **Age categories** sit under each event, youngest first, with a competitor count.
- **Competitors** are listed by name. A competitor entered in two events appears under both. For example, Emily appears under Geup 9 and Geup 7.
- Events and categories with no entries are skipped. A summary line at the top shows the total competitors and total entries.
- Event headings are never left alone at the bottom of a page. Page numbers appear in the footer.
- The staff log keeps its extra columns (email, phone, paid/proof status) inside each group.

## Technical details
- Add a shared helper in `PublicPerthComp.tsx` that takes entries and returns groups (event → division → rows), using the existing event order and `eventLabel`/`gradeLabel`.
- Render each group with `jspdf-autotable`, tracking `lastAutoTable.finalY` and adding a page when fewer than about 30mm remain before a heading.
- QA: generate the PDF with sample data and inspect each page.
