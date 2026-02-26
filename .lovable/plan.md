

## Update Student List to Single-Line Row Layout

### Changes to `src/components/sales/StudentManagementList.tsx`

**Replace the current two-line card layout (lines 314-348) with a single-line row:**

Each row displays all info on one line:
```text
☐  STUDENT NAME    |  +65XXXXXXXX  |  email@example.com  |  [Belt Badge] [Status]
```

- Name: uppercase, bold, fixed width
- Contact: phone number, muted text
- Email: muted text
- Belt + Status badges on the right
- Single line per student, no wrapping
- Keep checkbox, click-to-navigate, and all existing functionality

