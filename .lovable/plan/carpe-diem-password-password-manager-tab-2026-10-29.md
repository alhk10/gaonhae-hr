# Carpe Diem password + Password Manager tab

## 1. New Carpe Diem Stradia password
- Add password Hp89891504 that opens only Carpe Diem Stradia.
- The existing Bukit Merah password (which also opens Carpe Diem) stays as it is.

## 2. Password Manager tab in /access (Hp97533488 only)
- New tab "Passwords", visible only when signed in with the all-branch password.
- Lists each branch password (masked, with its branches).
- Actions:
  - Add password: type a password, tick one or more branches (or "All branches").
  - Change branches for an existing password.
  - Change password text (old one stops working immediately).
  - Delete password, with confirmation.
- Safeguard: the all-branch password Hp97533488 cannot be deleted or demoted from the tab.
- Passwords cannot be read back after saving (stored scrambled); the list shows a short label such as the last 3 characters.

## Technical details
- Migration inserts a hashed row for Hp89891504 → branch `BR1769014316844`.
- Add a `label` / `id` to password rows (grouped by hash) so the tab can show and edit them.
- New SECURITY DEFINER functions `access_password_list`, `access_password_save`, `access_password_delete`, each requiring the caller's all-branch password server-side (not just hidden in the UI). Hashing uses the same method as existing rows.
- New `PasswordManagerTab.tsx` added in `PublicGradingList.tsx` behind `isAllBranch`.
- Record rule in AGENTS.md.
