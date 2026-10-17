# Gig Worker Companion

Two connected features for gig and platform workers in India:

- **Earnings Companion** – log daily earnings, fuel/expenses and hours; record payouts per platform. Shows net this week, net ₹/hour, what each platform still owes (payouts are matched to the oldest earnings first) and flags amounts unpaid for 7+ days.
- **Support Desk** – safety, worker rights, welfare schemes and documents Q&A from a curated knowledge base, plus a complaint-letter generator, in **English and Hindi** (switch in the header). "Draft complaint" on an overdue platform balance pre-fills the letter from your records.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build && npm start
```

Requires Node 18.18+ (developed on Node 26, npm 11).

## Languages

The whole UI, the curated guide entries, emergency labels and the complaint letter are available in English and Hindi. Hindi questions are matched to the same curated entries, and in AI mode Gemini is asked to answer in the chosen language. The Hindi text was written for this app and has **not** been reviewed by a professional translator; tests check that helpline numbers and websites match the English entries. The language choice is remembered in the browser. Other languages need a new entry in `src/lib/i18n.js` and `src/lib/support/kb.<lang>.js`.

## AI mode vs demo mode

Without `GEMINI_API_KEY` the Support Desk runs in **demo mode** (labelled in the UI): it returns the matching curated guide entries and uses no AI.

To enable **AI mode** (Google Gemini via the official `@google/genai` SDK):

1. Create a key at <https://aistudio.google.com/apikey>.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY=...` (server-side only; never use a `NEXT_PUBLIC_` prefix). Optionally set `GEMINI_MODEL` (default `gemini-3.5-flash-lite`).
3. Restart the server.

In AI mode the question plus the matched guide entries are sent to Gemini, which writes a short summary shown above those entries. The model is told to use only facts in the entries, and the server rejects any answer that is blocked, truncated, empty, too long, or that mentions a website or helpline-style number not present in the entries. In any of those cases, or if the API call fails or times out, the app falls back to demo mode. The key is read only on the server and is never included in API responses. Emergency numbers and the guide entries come from fixed code, not from the model, and the emergency banner does not depend on it. The complaint letter is template-based in both modes.

Model calls are capped at 30 per minute per server instance (over the cap the app serves demo-mode answers), so a public link cannot run up your Gemini quota unboundedly.

The guard cannot verify that the model's prose is accurate, which is why the curated entries are always shown next to it and the UI labels the summary as AI-generated.

## Deploying on Vercel

Vercel's filesystem is read-only apart from `/tmp`, so on Vercel the app stores records in `/tmp`, which is **shared by everyone using the link and cleared whenever the instance restarts**. The UI shows a banner saying so. That is fine for a public demo (do not enter real personal data) but not for real use, which needs a database and sign-in. Set `GEMINI_API_KEY` in the Vercel project settings to enable AI mode; without it the deployment runs in demo mode. `APP_TIME_ZONE` (default `Asia/Kolkata`) controls what counts as "today".

## Design notes

- Money is stored as integer paise; never floats.
- Data lives in `.data/db.json` (override with `GWC_DATA_DIR`), written atomically through a serialised queue. A corrupt file is reported as an error, never silently overwritten.
- All input is validated on the server with zod; field errors are shown inline.

## Limitations

- Single user, no login: anyone who can reach the server sees and can change all the data. Fine locally; add auth and a database before real use. File storage needs a persistent disk, so serverless hosting is demo-only (see above).
- Knowledge-base content is general information reviewed June 2026, not legal advice; schemes and state laws change. Verify against the official links.
- Only English and Hindi; no export or editing of existing records. Emergency detection is keyword-based and cannot catch every emergency; the UI always shows 112.
