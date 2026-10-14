# Perth page: club dropdown with "add new club"

## What parents will see
- The **Club** field on the /perthcomp registration form becomes a dropdown listing clubs that have already registered (always including **Gaonhae Taekwondo** at the top).
- The last option is **"Other / add a new club"**. Choosing it reveals a text box where the parent types the new club name.
- Once a registration is submitted with a new club, that club automatically appears in the dropdown for the next visitor — no admin step needed.
- The club name is saved exactly as before, so the staff registration log and PDF are unchanged.

## Technical details
- Add a small server function `get_perth_event_clubs()` (readable by anyone) that returns the distinct, sorted list of club names already in `perth_event_registrations`. The page loads it on open and merges it with "Gaonhae Taekwondo".
- Replace the free-text `Input` with a `Select` of those clubs plus an "Other / add a new club" entry; when "Other" is chosen, show a required text input and use its value as the club.
- The existing submit function already accepts any club string, so no change is needed there — new clubs are stored on submit and feed the next dropdown load.
- Validation stays: a club (selected or typed) is required before submitting.
