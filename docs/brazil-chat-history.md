# Brazil chat history

Server persistence added 2026-11-04. Private history is never committed to Git.

- life_brazil_chat_history stores immutable content-addressed snapshots in the existing Supabase project. Only service_role SELECT/INSERT are granted; no browser roles, update or delete privileges. life_brazil_chat_heads returns all non-prefix heads, retaining divergent conversations.
- Authenticated history GET/POST use Life authentication; POST also requires the same browser-facing Origin. Each chat question is persisted before generation, each answer before returning it. No chat text is logged.
- The browser retains life-brazil-chat-history-v1 and a pre-cloud backup, reads legacy copies before synchronization, and never resets unreadable archives. Upload failures retry while preserving local state.
- Both production domains must serve the application without a Vercel domain redirect. Life authentication is shared by a secure HttpOnly parent-domain cookie only for these two hosts. Legacy www host-only cookies are cleared after promotion; logout clears both forms.
- The hidden first-party history bridge reads local storage on the alternate domain. It accepts only an exact peer origin, the parent window, and a request nonce; CSP frame-ancestors excludes other parents. Originals on the alternate origin are never modified by the bridge.
- Actual legacy import requires the owner's original browser to load the updated chat. Server tests cannot demonstrate recovery of local data that has not reached the server. Never claim recovery until imported conversation counts are verified. If iframe storage access is blocked, open the chat directly on each production origin in the same browser.

Validation covers prefix/stale merges, divergent branches, unchanged legacy citations, quota failures, auth/CSRF and bridge message origins. Database transaction tests preserve both branches and verify minimal grants. REST duplicate inserts are idempotent. Existing portal and Assessor schedules remain registered; Intercom stays independent.

The synthetic installation-check row archive-smoke-20261104 is retained: its cleanup was declined. It is excluded from personal-history reads; normal snapshots and browser originals are never deleted.
