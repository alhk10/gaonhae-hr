# FAQ tab in /access

## What you'll get
A new **FAQ** tab in /access, visible for every branch password. It lists 5 guides you can expand. Each guide shows numbered steps, and each step has a screenshot of the real /access screen with the button to click highlighted.

1. How to manually add a student
2. How to manually add an invoice
3. How to add attendance
4. How to refund as credit
5. How to delete a draft invoice

## Steps per guide (draft wording)
1. **Add student**: Students tab > Add Student (or Add Trial Student) > fill name, DOB, gender, contact (branch is locked to your password) > Save.
2. **Add invoice**: Students tab > click student name > Create invoice icon > pick term/products/class slots > check total > Save as draft or Send.
3. **Add attendance**: Attendance tab > choose day > Add student on a timeslot (or Copy previous) > pick name > mark Attended / Absent. Unpaid warning explained.
4. **Refund as credit**: open the invoice > Refund > choose line and quantity > reason > submit; staff refunds wait for superadmin approval, then credit shows on the student.
5. **Delete draft invoice**: open a Draft invoice > Delete > confirm (no approval needed for drafts only; other statuses need approval).

## How screenshots are made
I'll sign in to /access in a test browser, walk through each flow on a sample student, capture each step, crop and mark the relevant button, and save the images with the app. Nothing is saved to real data (I'll stop before final Save/Delete, or use a throwaway draft I delete afterwards). Student names/phones in shots will be blurred.

## Technical details
- New `FaqTab.tsx` in `src/components/grading-list/`, using Accordion; tab added in `PublicGradingList.tsx` without `isAllBranch` gate, placed last.
- Images in `src/assets/faq/*.jpg`, imported as ES modules; click-to-enlarge dialog.
- Guide content in a typed array so steps are easy to edit later.
