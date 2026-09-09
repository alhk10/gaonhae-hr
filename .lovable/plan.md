# Fix "Hello" chat: cannot start a conversation

Visitors on the /hello chat get "new row violates row-level security policy" as soon as they press Continue, so the conversation never starts.

## What's happening

Confirmed against the live database: visitors (not logged in) are allowed to create a chat session, but they are not allowed to read anything back. The app saves the new session and immediately asks for its reference back — that read is blocked, so the whole step fails and the visitor sees the error.

The same "write allowed, read blocked" setup exists on the other visitor chat records (chat events, callback requests, payment submissions), so the same failure can appear later in the flow if any of those steps needs the saved record back.

## The fix

- Let the visitor's own newly created chat session be readable back to them, so the chat can continue. Visitors still cannot browse or read anyone else's sessions.
- Do the same for callback requests and payment submissions the visitor just created, so booking a callback and submitting a payment don't hit the same wall.
- Re-test the flow end to end on /hello: fill in name, date of birth and branch, press Continue, and confirm the chat advances with no error.

## Technical detail

- Root cause: PostgreSQL raises `new row violates row-level security policy` when an `INSERT ... RETURNING` (PostgREST `.select()` after `.insert()`) has no matching SELECT policy. `public_chat_sessions` has `anon insert chat sessions` (INSERT, anon+authenticated) but SELECT is limited to `authenticated`. Table grants are correct.
- Implementation option A (preferred, keeps data closed): replace `createChatSession` in `src/services/publicChatService.ts` with a `SECURITY DEFINER` RPC `create_public_chat_session(...)` that inserts and returns the new id; grant EXECUTE to `anon`/`authenticated`. Apply the same pattern to `createCallbackRequest` / payment-submission inserts that use `.select()`.
- Implementation option B (smaller change): add narrow anon SELECT policies. Since there is no per-visitor identifier, this would expose rows broadly — not recommended for records containing names, emails and phone numbers.
- Plan follows option A. No UI changes.
