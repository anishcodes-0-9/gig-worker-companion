# Gig Worker Companion

Two connected features for gig and platform workers in India, in **English, Hindi, Punjabi, Tamil and Marathi**:

- **Earnings Companion**: log daily earnings, fuel/expenses and hours, and record payouts per platform. It shows net this week, net ₹/hour and what each platform still owes; payouts are matched to the oldest earnings first. Amounts unpaid for 7+ days are flagged.
- **Support Desk**: answers on safety, worker rights, welfare schemes and documents from a curated knowledge base, with optional Gemini summaries. It also has a complaint-letter generator. "Draft complaint" on an overdue platform balance pre-fills the letter from your records.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build && npm start
```

Requires Node 18.18+ (developed on Node 26, npm 11). Copy `.env.example` to `.env.local` for optional settings.

## Your records: anonymous workspaces

On first visit the server issues a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over HTTPS). The workspace id is a SHA-256 hash of that token. The id is never accepted from the client, and the raw token is never stored. Every read, write and delete of records is scoped to that id, so another browser cannot list or delete your records; a cross-workspace delete returns 404.

This is **separation, not authentication**. There is no login. Anyone using the same browser profile sees the same records, and clearing cookies loses access.

Storage backend, chosen at runtime and shown in the UI:

| Environment | Backend | UI label |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`) | Upstash Redis over REST: one hash per workspace and record type, 90-day expiry after the last write | "saved for up to 90 days" |
| Vercel without those variables | In-memory, per workspace. Lost when the instance restarts and not shared between instances. Never a shared file. | "Demo storage … can disappear at any time" |
| Local (`next dev` / `next start`) | One JSON file per workspace in `.data/` (or `GWC_DATA_DIR`), written atomically | "stored in a file on the computer running this app" |

Each workspace is capped at 1,000 records per type. Past the cap, saving returns 409.

## Languages

The whole UI, the 14 guide entries, emergency labels, emergency keywords and the complaint letter exist in all five languages. Questions in any of them are matched to the same curated entries. Prefix matching is used for Indic scripts, because those languages add endings directly to words. In AI mode Gemini answers in the chosen language. The letter language can be chosen separately from the UI language. The template parts of the letter follow the letter language. Your own details paragraph stays exactly as you wrote it, unless AI wording is on and the rewritten text passes the fact check. If that check rejects it, which is common when numbers are written as words, your original text is kept.

- **Hindi** was written for this app.
- **Punjabi, Tamil and Marathi** are machine translations made with an AI model during development and reviewed by no one.

**No translation has been reviewed by a native speaker or professional translator.** The UI says so in each non-English language. Tests check that every guide entry keeps the English entry's helpline numbers, years and websites, and that every language has every UI string and placeholder. They cannot check fluency or nuance.

## AI mode vs demo mode

Without `GEMINI_API_KEY` the app runs in **demo mode**, which is labelled in the UI. The Support Desk returns the matching curated entries, letters come from the template, and no AI is used.

To enable **AI mode** (Google Gemini via the official `@google/genai` SDK):

1. Create a key at <https://aistudio.google.com/apikey>.
2. Set `GEMINI_API_KEY` in `.env.local`, or in Vercel's project settings. It is read only on the server; never give it a `NEXT_PUBLIC_` prefix. Optionally set `GEMINI_MODEL`; the default is `gemini-3.5-flash-lite`.
3. Restart the server.

**Support answers.** The question plus the matched guide entries are sent to Gemini, which writes a short summary shown above those entries. The server rejects an answer, and falls back to demo mode, in any of these cases:

- the answer is blocked, truncated, empty or too long;
- it mentions a website or email domain not in the entries;
- it contains a number of 3 or more digits that is not in the entries.

The number check normalises Devanagari, Gurmukhi and Tamil digits. It joins digit groups split by commas, spaces or hyphens, so `98765 43210` and `₹3,00,000` count as one number. Numbers from the user's question are **not** trusted, so the model cannot "confirm" a fake helpline the user typed. This check catches invented facts; it cannot prove the prose is accurate. That is why the curated entries are always shown beside the AI text.

**Complaint letters.** If the worker ticks "Let AI tidy the wording", Gemini rewrites **only the details paragraph**. The rest of the letter is fixed template text filled from the form: date, recipient, subject, partner ID, amount, start date, request, enclosures and name. The worker's name and ID are never sent to the model. The rewrite is rejected, and the worker's own words are kept, if any of these happen:

- the set of numbers changes, including a number written as a word;
- a website, email or phone number is added;
- the length is far off;
- in English, the text claims the complaint was filed or submitted.

The UI says which happened. The app never sends or submits a complaint.

**Emergencies.** Emergency detection is deterministic keyword matching in all five languages. The emergency banner and helpline numbers come from fixed code, never from the model, and every Support Desk view shows "call 112".

**Limits.** Model calls time out after 12 s, and the AI routes set `maxDuration = 30`. Calls are capped at 30 per minute per server instance across both features; over the cap the app serves demo-mode answers. Only failure reasons are logged, with the key redacted; questions, letter details and answers are never logged.

## Deploying on Vercel

1. Import the GitHub repository into Vercel. The framework preset is Next.js and no build settings need changing.
2. Optionally set `GEMINI_API_KEY`, `GEMINI_MODEL` and `APP_TIME_ZONE` (default `Asia/Kolkata`).
3. For persistent records, add an Upstash Redis database, either from the Vercel Marketplace or the Upstash console, and set its REST URL and token. Without one the deployment works but labels its storage as temporary.

## Design notes

- Money is stored as integer paise, never floats.
- All input is validated on the server with zod, and field errors are shown inline.
- The API requires `application/json`, which forces a CORS preflight that the app never approves. It caps bodies at 16 KB and sets security headers (frame-ancestors none, nosniff, strict referrer).

## Limitations

- Anonymous workspaces are not accounts: there is no login, export or cross-device access.
- Knowledge-base content is general information reviewed in June 2026, not legal advice; schemes and state laws change. Verify against the official links.
- Emergency detection is keyword-based and cannot catch every emergency, so the UI always shows 112.
- The rate cap is per server instance, not global.
- No edit or export of existing records.
