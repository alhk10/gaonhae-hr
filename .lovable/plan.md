# Standardise the five `/access` lists

## Outcome
School Fees, Grading, Competitions, Seminars, and Uniforms & Guards will feel like one set of staff lists: easy to scan, consistent in order and presentation, and readable on phones without losing the details or controls staff need.

## Changes
1. Give each tab a consistent heading and filter/action area, while keeping its specific filters, printing, and settings.
2. Use a shared row hierarchy: student and branch first; item, event, or grading details next; payment status and amount together; proof and invoice links clearly identifiable; row actions in a consistent final position. Keep grading slots, competition categories/documents, seminar packages, and uniform sizes/collection visible where relevant.
3. Align typography, date and currency formatting, spacing, empty/loading states, status badges, action icon sizing, tooltips, and missing-value labels. Retain the existing clickable student names, invoice links/PDF access, verification, editing, refunds, and deletion approvals.
4. Make narrow screens readable with compact stacked rows and labelled secondary details instead of forcing staff to hunt through very wide tables. Keep a denser, aligned table presentation for larger screens; allow horizontal scrolling only when genuinely needed for specialised columns.
5. Check each tab at desktop and phone widths, including long names, multiple categories/items, pending and paid rows, and branch-restricted access. Confirm controls still open the same dialogs and respect permissions.

## Technical approach
- Limit changes to `/access` presentation code and reusable display helpers/components. Reuse the existing `StatusBadge`, `StudentNameButton`, and `InvoiceNumberButton` patterns and semantic design tokens.
- Preserve existing queries, statuses, payment/refund logic, server-side permissions, and database data. Do not redesign student or summary tabs.
