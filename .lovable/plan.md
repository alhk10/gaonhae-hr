

## Plan: Notices / Announcements Feature

### Database

**New table: `notices`**
- `id` UUID PK
- `subject` TEXT NOT NULL
- `content` TEXT (text body below image)
- `image_url` TEXT (optional uploaded image)
- `attachment_url` TEXT (optional file attachment)
- `attachment_name` TEXT
- `created_by_email` TEXT NOT NULL
- `created_by_branch_id` TEXT (NULL = superadmin post)
- `target_branches` TEXT[] (NULL = all branches; superadmin selects specific branches)
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**RLS policies:**
- SELECT: superadmins see all; employees see notices where their branch is in `target_branches` OR `target_branches` IS NULL OR notice was created by their branch
- INSERT: superadmins and employees with branch dashboard access
- UPDATE/DELETE: superadmins, or creator of the notice

**Storage bucket:** `notice-attachments` (public)

### New Components

1. **`src/components/notices/NoticeManagementTab.tsx`** — Tab content for both Superadmin and Branch dashboards
   - Lists existing notices with subject, date, preview
   - "Add Notice" button opens creation dialog
   - Edit/Delete actions on each notice
   - **Superadmin version**: shows a multi-select branch picker for target branches (or "All Branches")
   - **Branch version**: automatically targets all branches (branch posts for their own branch visibility)

2. **`src/components/notices/CreateEditNoticeDialog.tsx`** — Dialog form with:
   - Subject field (text input, required)
   - Image upload (drag-drop or click, uploads to `notice-attachments` bucket)
   - Content/body textarea
   - File attachment upload field
   - Branch selector (multi-select, only shown for superadmin role)
   - Save/Cancel buttons

3. **`src/components/notices/NoticePopupDialog.tsx`** — Read-only popup shown when clicking a notice
   - Displays subject as title
   - Image below subject
   - Content text below image
   - Attachment download link if present
   - Close button

4. **`src/services/noticeService.ts`** — CRUD operations for notices table + file upload helpers

### Integration Points

**`SuperadminDashboard.tsx`**: Add a "Notices" tab trigger alongside "Overview". The tab content renders `NoticeManagementTab` with `role="superadmin"`.

**`BranchDashboard.tsx`**: Add a "Notices" tab trigger in the existing tab list. Renders `NoticeManagementTab` with `role="branch"` and `branchId` prop.

### Flow

- **Creating**: Staff clicks "Add Notice" → fills form → image/file uploaded to storage → record inserted into `notices` table
- **Viewing**: Notice list shows cards; clicking one opens `NoticePopupDialog` with full details
- **Branch posting**: `target_branches` set to NULL (visible to all), `created_by_branch_id` set to poster's branch
- **Superadmin posting**: `target_branches` set to selected branch IDs, `created_by_branch_id` NULL

