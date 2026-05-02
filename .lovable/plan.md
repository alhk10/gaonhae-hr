## Document Library Module

A new top-level page `/documents` for uploading certificates and identity documents, with AI-powered matching to existing students or employees.

### Document Categories (dropdown)

- **Kukkiwon Poom** — 1, 2, 3, 4
- **Kukkiwon Dan** — 1, 2, 3, 4, 5, 6, 7, 8, 9
- **STF Poom** — 1, 2, 3, 4
- **STF Dan** — 1, 2, 3, 4, 5, 6, 7, 8, 9
- **NRIC / FIN**
- **EP / SP / WP**
- **Passport**
- **STF Poomsae Referee** — 3P, 3, 2, 1, S
- **STF Poomsae Coach** — Level 1, 2, 3
- **STF Kyorugi Referee** — Rank 3P, 3, 2, 1, S
- **SG Coach Course** — Level 1, 2, 3
- **STF Coach Induction Course**
- **Others** (free-text label)

### Page Layout (`/documents`)

```text
+------------------------------------------------------------+
| Document Library                          [Upload button]  |
+------------------------------------------------------------+
| Filters: [Type ▼] [Linked to ▼ student/employee/unmatched] |
|          [Branch ▼] [Search box]                           |
+------------------------------------------------------------+
| Drag & Drop Zone (also click to upload, multi-file)        |
+------------------------------------------------------------+
| Documents Table:                                           |
|  Preview | Type | Linked Person | Branch | Uploaded | Action|
|  thumb   | Dan 3| KIM JONG (EMP)| Yishun | 02/05/26 | View  |
+------------------------------------------------------------+
```

### Upload Flow

1. User drags / selects 1+ files (PDF/JPG/PNG, ≤20MB each).
2. Per-file side panel asks: **Document Type** dropdown (required) + sub-level (e.g. Kukkiwon Poom 1, Kukkiwon Dan 5, Referee 3P) + optional notes.
3. File uploads to private Storage; row inserted in `documents` table with `match_status = 'pending'`.
4. Edge function `documents-ai-match` runs:
   - OCR + analyse the file via Lovable AI (gemini vision).
   - Extracts: full name, NRIC/FIN/passport number, date of birth, expiry.
   - Searches `students` then `employees` for best match (exact ID > fuzzy name + DOB).
   - Returns top suggestion + confidence score.
5. **Confirmation dialog** shows extracted fields, suggested match, confidence %, with buttons: **Confirm**, **Pick different person** (search), **Skip (leave unmatched)**.
6. On confirm, document is linked and appears on that person's profile.

### Profile Integration

- Student Details and Employee Details pages each get a new **Documents** section listing linked docs (type + level, uploaded date, view / download / delete).

### Access

- **Superadmin**: full access to all documents across branches.
- **Branch staff** (employees with `can_view_dashboard`): upload and view documents linked to students/employees in their branch only.
- Students/employees themselves: not in this iteration.

### Technical Details

**Database (new migration)**

Table `documents`:
- `id uuid pk`
- `document_type text` — `kukkiwon_poom | kukkiwon_dan | stf_poom | stf_dan | nric_fin | ep_sp_wp | passport | stf_poomsae_referee | stf_poomsae_coach | stf_kyorugi_referee | sg_coach | stf_coach_induction | others`
- `document_level text` — sub-level (e.g. `1`..`9` for Dan, `1`..`4` for Poom, `3P|3|2|1|S` for referees, `1|2|3` for coach levels). Null when not applicable.
- `custom_label text` — used when `document_type = 'others'`
- `file_url text`, `file_name text`, `file_mime text`, `file_size_bytes int`
- `linked_type text` — `student | employee | null`
- `linked_id text`
- `branch_id text` — denormalised for filtering / RLS
- `match_status text` — `pending | matched | unmatched | rejected`
- `match_confidence numeric`
- `extracted_data jsonb` — name, id_number, dob, expiry, etc.
- `notes text`
- `uploaded_by_email text`
- `created_at`, `updated_at`

RLS:
- Superadmin: all.
- Branch staff: read/insert/update where `branch_id` matches their `employee_branch_access`, OR `linked_type/linked_id` resolves to a person in their branch.

**Storage**

New **private** bucket `documents`. Files served via signed URLs on demand (NRIC/passport are sensitive).

**Edge function** `documents-ai-match`
- Input: `{ document_id }`
- Reads file from storage, calls Lovable AI `google/gemini-3-flash-preview` with vision + tool-calling schema (extract name, id_number, dob, document_kind, level).
- Queries `students` and `employees`, scores matches, writes `extracted_data` + suggested match + confidence back to the row.

**Frontend**
- New page: `src/pages/DocumentLibrary.tsx` (route `/documents`, protected, branch-aware).
- New components in `src/components/documents/`:
  - `DocumentUploadZone.tsx` (drag & drop + file picker)
  - `DocumentTypeSelectDialog.tsx` (type + level per file before upload)
  - `DocumentMatchConfirmDialog.tsx` (review AI suggestion + manual person picker)
  - `DocumentList.tsx` (filterable table)
  - `PersonDocumentsTab.tsx` (embedded into Student/Employee detail pages)
- New service: `src/services/documentService.ts`
- New constants: `src/constants/documentTypes.ts` — single source of truth for the dropdown (types + their valid levels).
- Sidebar entry: "Documents" (FileText icon) above Settings.

### Out of scope (this iteration)

- Document expiry reminders / notifications
- Versioning / re-upload history
- Student/employee self-upload via portal
- Bulk re-run of AI matching on existing rows
