# Core Member Recruitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give RO-BIO a Google Form (built by Apps Script), a judges' handbook and a passcode-protected recruitment section on the website, so about 15 core members can be picked from 100+ applicants on 11 and 12 Nov 2026.

**Architecture:**
- **Form:** a standalone Apps Script file builds the form and its response Sheet, and sends confirmation emails in hourly batches.
- **Website:** follows the existing Robo Spark judge and certificates pattern:
  - shared rules in `src/lib/recruit.ts`
  - one Durable Object SQLite store
  - one `/api/recruit/*` handler with an admin passcode and a judge passcode
  - two `noindex` pages
- **Delivery:** a zip of the changed files.

**Tech Stack:** Google Apps Script (V8); TanStack Start + React 19, Cloudflare Workers with Durable Objects (SQLite); vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-07-core-recruitment-design.md`

## Global Constraints

- No em dashes or en dashes anywhere: code, comments, copy, docs (AGENTS.md).
- Branch names exactly as `BRANCHES` in `src/lib/certificates.ts` (reuse it, do not copy it).
- Squads, exactly: `Projects`, `Events`, `Technical`, `Social Media and Outreach`, `Design`.
- Rooms: Projects, Technical, Design in **G-07**; Events, Social Media and Outreach in **G-09**. Second year block.
- Days: Wed 11 Nov 2026 and Thu 12 Nov 2026, 4 to 5 pm, arrive by 3:45 pm.
- Criteria and weights: Communication x4, Teamwork in the group question x4, Interest and commitment x4, Squad skill x6, Attitude and learning x2. Marks 1 to 5. Total out of 100.
- Core cap shown as "Core: x of 15".
- The words "supporting member" never appear in anything a student sees (form, emails, thank-you page).
- No applicant data in the repo. Secrets `RECRUIT_ADMIN_PASSCODE`, `RECRUIT_JUDGE_PASSCODE` live only in Cloudflare.
- Bot Forge registration stays "coming soon". Nothing in `site.ts` events changes.
- Email from ro.bio.muse@gmail.com: at most 15 per hourly run, never past `MailApp.getRemainingDailyQuota()`.

## Review Focus

1. **The same student submits the form twice.** The last submission counts and they get one email, not two. Tested in Task 1 (queue skips rows already marked Sent) and Task 3 (CSV keeps the last row per USN).
2. **A senior opens a student from another squad** by guessing the id. The API refuses (403). Tested in Task 4.
3. **A judge's phone reloads mid-group.** Their saved marks come back and nothing is lost or duplicated. Each (candidate, judge) pair is one row, upserted. Tested in Task 4.
4. **The admin re-imports the Sheet after wildcards and statuses were set.** Existing students keep their status and wildcard flag, and only the form fields update. Tested in Task 4.
5. **Judges' names typed differently** ("Brunda", "brunda ") must count as one judge. Names are cleaned and matched without case. Tested in Task 3.

---

### Task 1: Google Form Apps Script

**Files:**
- Create: `recruitment/form/Code.gs`
- Create: `recruitment/form/SETUP.md` (step-by-step for a non-coder: paste, Run `setup`, allow permissions, copy form link)
- Test: `src/lib/recruit-form-script.test.ts` (loads `Code.gs` text into `node:vm` and tests the pure functions)

**Interfaces:**
- Produces, in `Code.gs`:
  - `setup()`: creates the form, response Sheet, Summary tab, "Email queue" tab, an on-submit trigger and an hourly trigger. Stores ids in `PropertiesService`. Safe to run again: if the form id already exists, it stops and says so.
  - `onSubmit(e)`: appends a queue row, and writes "Assigned day" into the response row.
  - `sendQueued()`: hourly batch sender.
  - `closeForm()`: closes the form by hand. `setup` also creates a one-time trigger for Tue 10 Nov 2026 18:00 Asia/Kolkata.
- Pure helpers, which the test calls:
  - `roomFor(squad: string): "G-07" | "G-09"`
  - `pickDay(wed: number, thu: number): "Wed 11 Nov" | "Thu 12 Nov"`: the lesser count, ties go to Wed
  - `assignDay(answer: string, wed: number, thu: number): string`: "Either day is fine" calls `pickDay`, anything else is returned as is
  - `emailFor(r: {name: string; first: string; day: string}): {subject: string; body: string}`
  - `batchSize(remaining: number): number`: `Math.max(0, Math.min(15, remaining - 5))`, which keeps 5 for safety
- Form question titles, used as CSV headings in Task 3:
  - `Email address` (form setting: collect email, responder input)
  - `Full name`, `USN`, `WhatsApp number`, `Branch`, `Semester` (options `1st`, `3rd`)
  - `First choice squad`, `Second choice squad` (the squads plus `No second choice`)
  - `Interview day` (`Wed 11 Nov`, `Thu 12 Nov`, `Either day is fine`)
  - a consent checkbox
- Squad option text is the bare squad name. The one-line descriptions go in the question help text.
- The thank-you message lists both days, 4 to 5 pm, both rooms and which squads are in each. It says "Either day" students get their day by email.

- [ ] **Step 1: Write failing tests** in `src/lib/recruit-form-script.test.ts`:
  - `roomFor("Design") === "G-07"` and `roomFor("Events") === "G-09"`
  - `pickDay(3, 3) === "Wed 11 Nov"` and `pickDay(5, 2) === "Thu 12 Nov"`
  - `assignDay("Thu 12 Nov", 0, 9) === "Thu 12 Nov"`
  - `batchSize(100) === 15`, `batchSize(12) === 7`, `batchSize(3) === 0`
  - The `emailFor({name:"Asha", first:"Design", day:"Wed 11 Nov"})` body contains `G-07`, `4 to 5 pm`, `3:45 pm`, `pen and paper`
  - The `emailFor` result for Events has no `pen and paper`
  - The whole file text has no `supporting`, no em dash (U+2014) and no en dash (U+2013)
- [ ] **Step 2: Run** `npx vitest run src/lib/recruit-form-script.test.ts`. Expected: FAIL, file not found.
- [ ] **Step 3: Write `Code.gs`.**
  - `sendQueued` reads queue rows whose Status is empty.
  - It sends `batchSize(MailApp.getRemainingDailyQuota())` of them with `MailApp.sendEmail({to, subject, body, name: "RO-BIO"})`.
  - It writes `Sent <time>`, or `Failed: <message>`, on each row.
  - `onSubmit` skips queueing when the same email already has a Sent row with the same day and first squad. A changed choice is queued again.
  - Summary tab:
    - `COUNTIFS` per squad per assigned day
    - a "Waiting for email" count
  - Lock with `LockService` in `onSubmit` so two submissions at once cannot get the same day count.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: recruitment form apps script`.

### Task 2: Judges' handbook and messages

**Files:**
- Create: `recruitment/judges-handbook.html`: printable, self-contained, works offline. Also published as an Artifact for sharing.
- Create: `recruitment/messages.md`: WhatsApp announcement, Instagram caption, three result messages (core, "we'd love you to work with the X squad", not selected this time), induction note.

**Content the handbook must carry** (from spec Parts 2 and 3):
- Run sheet: arrival, queue by first choice, groups of 4, about 12 minutes per group, the design waiting-time sketch, teachers moving between rooms, splitting a panel when a squad has more than 20 on one day.
- The criteria table with 1, 3 and 5 descriptions, squad skill per squad, rules for judges, selection and tie-break.
- Per squad: 6 to 8 personal questions and 4 group questions.
- Design: 3 topics, at least one about Bot Forge (for example a Robo Sumo poster).
- A short "how to use /recruit/judge on your phone".

- [ ] **Step 1: Load the `artifact-design` skill**, then write the handbook.
- [ ] **Step 2: Check:** `grep -c $'\u2014\|\u2013' recruitment/*` prints 0, and `grep -ci supporting recruitment/messages.md` matches only the internal heading of the supporting template.
- [ ] **Step 3: Publish** the handbook as an Artifact (private link for the club to share).
- [ ] **Step 4: Commit** `docs: judges handbook and recruitment messages`.

### Task 3: Shared recruitment rules (`src/lib/recruit.ts`)

**Files:**
- Create: `src/lib/recruit.ts`
- Test: `src/lib/recruit.test.ts`

**Interfaces:**
- Consumes from `src/lib/certificates.ts`: `BRANCHES`, `parseCsv`, `cleanEmail`, `isEmail`, `cleanPersonName`, `tidyNameCase`. From `src/lib/judging.ts`: `cleanName`.
- Produces:

```ts
export const SQUADS: readonly ["Projects","Events","Technical","Social Media and Outreach","Design"];
export type Squad = (typeof SQUADS)[number];
export const ROOMS: Record<Squad, "G-07" | "G-09">;
export const DAYS: readonly ["Wed 11 Nov", "Thu 12 Nov"];
export type Day = (typeof DAYS)[number];
export const CORE_CAP = 15;
export type CriterionKey = "communication" | "teamwork" | "commitment" | "skill" | "attitude";
export const CRITERIA: { key: CriterionKey; title: string; weight: number; low: string; mid: string; high: string }[];
export const SQUAD_SKILL: Record<Squad, string>;
export type Status = "undecided" | "core" | "supporting" | "not-selected";
export type NewCandidate = { usn: string; name: string; email: string; phone: string; branch: string; sem: 1 | 3; first: Squad; second: Squad | null; day: Day | null; wildcard: boolean };
export type Candidate = NewCandidate & { id: number; status: Status; addedAt: number };
export type JudgeView = Pick<Candidate, "id" | "usn" | "name" | "branch" | "sem" | "first" | "day">; // no email or phone
export type JudgeSquad = Squad | "Teacher";
export type Sheet = { candidateId: number; judge: string; squad: JudgeSquad; marks: number[]; note: string; updatedAt: number };
export type Result = { candidate: Candidate; judges: number; average: number; byCriterion: Record<CriterionKey, number>; notes: { judge: string; note: string }[]; fewJudges: boolean };

export function cleanUsn(raw: unknown): string;               // trim, remove spaces, upper case; "" if not 4 to 20 letters/digits
export function validateCandidate(raw: unknown): { ok: true; candidate: NewCandidate } | { ok: false; error: string };
export function readRecruitCsv(text: string): { rows: (NewCandidate & { line: number; problems: string[] })[]; missing: string[] };
export function parseSheet(raw: unknown): { ok: true; sheet: Omit<Sheet, "updatedAt"> } | { ok: false; error: string };
export function weightedTotal(marks: number[]): number;      // sum of mark * weight, 20 to 100
export function canJudge(squad: JudgeSquad, c: Pick<Candidate, "first">): boolean; // Teacher: all; else c.first === squad
export function toJudgeView(c: Candidate): JudgeView;
export function summarize(candidates: Candidate[], sheets: Sheet[]): Result[];
export function rankSquad(results: Result[], squad: Squad): Result[];
export function coreCount(candidates: Pick<Candidate, "status">[]): number;
export function resultsCsv(results: Result[]): string;     // columns: Squad, Rank, Name, USN, Branch, Sem, Average, Judges, Status, Notes
export async function recruitApi<T>(role: "admin" | "judge", passcode: string, path: string, init?: RequestInit): Promise<T>;
```

- Store marks as an array in `CRITERIA` order.
- `average` is the mean of `weightedTotal` over that student's sheets, to 1 decimal place. A student with no sheets gets `average: 0`, `judges: 0`, `fewJudges: true`.
- `rankSquad` filters by `candidate.first === squad`. It sorts by average, then the skill average, then the commitment average, then name, A to Z.
- `readRecruitCsv` finds columns by heading prefix, the same way `readFormCsv` does:
  - `"email address"`, `"full name"`, `"usn"`, `"whatsapp number"`, `"branch"`, `"semester"`, `"first choice squad"`, `"second choice squad"`, and `"assigned day"` if present, otherwise `"interview day"`.
  - `"No second choice"` becomes `null`. `"Either day is fine"` with no assigned day becomes `null` and is flagged with the problem `"no day yet"`. That is a warning only, and the row can still be imported.
  - A second choice equal to the first becomes `null`.
  - With the same USN on several lines, the last line wins, and earlier lines get the problem `"replaced by line N"`.
- `parseSheet`:
  - Requires 5 integers from 1 to 5.
  - Cleans the judge name with `cleanName`; it must not be empty.
  - Squad must be one of `SQUADS` or `"Teacher"`.
  - Cuts the note to 280 characters.

- [ ] **Step 1: Write failing tests:**
  - `weightedTotal([5,5,5,5,5]) === 100` and `weightedTotal([1,1,1,1,1]) === 20`
  - `weightedTotal([3,4,2,5,1]) === 3*4+4*4+2*4+5*6+1*2` (= 68)
  - `summarize` with two sheets 68 and 80 gives `average 74`, `judges 2`, `fewJudges false`
  - One sheet gives `fewJudges true`
  - `rankSquad` tie on average is broken by skill average
  - Students whose `first` is another squad are excluded
  - `canJudge("Design", {first:"Events"}) === false` and `canJudge("Teacher", {first:"Events"}) === true`
  - `toJudgeView` output has no `email` or `phone` keys
  - `parseSheet` refuses `marks:[0,1,2,3,4]`, refuses 4 marks, and refuses a judge `"   "`
  - Names `"Brunda "` and `"brunda"`: a test in Task 4 checks the store treats them as one
  - `readRecruitCsv` on a fixture CSV with every heading:
    - maps `"3rd"` to `3`, `"No second choice"` to `null`
    - prefers `Assigned day` over `Interview day`
    - the same USN on lines 2 and 5 keeps line 5, and line 2 gets `"replaced by line 5"`
    - lower case USN `"4mu24bm001"` becomes `"4MU24BM001"`
    - a missing USN column gives `missing` containing `"usn"`
  - `coreCount` counts only `"core"`
  - `resultsCsv` quotes a note containing a comma
  - No em or en dash in `CRITERIA` text
- [ ] **Step 2: Run** `npx vitest run src/lib/recruit.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `src/lib/recruit.ts`.** Copy the `CRITERIA` and `SQUAD_SKILL` text from spec Part 3. `recruitApi` sends the header `x-admin-passcode` or `x-judge-passcode` to `/api/recruit/<role>/<path>`, and throws `Error(data.error)` when the response is not ok. Copy `judgeApi` in `judging.ts`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: recruitment rules and scoring`.

### Task 4: Store, API and wiring

**Files:**
- Create: `src/server/recruit-store.ts`
- Create: `src/server/recruit-api.ts`
- Modify:
  - `src/server.ts`: export `RecruitStore`, and route `/api/recruit/` the way `/api/certificates/` is routed, inside `withSecurityHeaders`
  - `wrangler.jsonc`: binding `{ "name": "RECRUIT_STORE", "class_name": "RecruitStore" }`, migration `{ "tag": "v3", "new_sqlite_classes": ["RecruitStore"] }`, and a comment naming the two secrets
  - `src/server/cloudflare.d.ts`, only if the types need it
- Test: `src/server/recruit-api.test.ts`. It uses an in-memory fake that has the same public methods as `RecruitStore`.

**Interfaces:**
- `RecruitStore extends DurableObject` methods:
  - `list(): Candidate[]`, `sheets(): Sheet[]`, `sheetsBy(judge: string): Sheet[]`
  - `add(rows: NewCandidate[]): { added: number; updated: number }`: upsert by USN. Form fields update; `status`, `wildcard` (when already true) and `addedAt` are kept.
  - `edit(id: number, c: NewCandidate): Candidate | null`, `remove(id: number): boolean` (also deletes that student's sheets), `setStatus(id: number, s: Status): boolean`
  - `saveSheet(s: Omit<Sheet,"updatedAt">): Sheet`: primary key `(candidate_id, judge COLLATE NOCASE)`
  - `isLocked(): boolean`, `setLocked(b: boolean): void`, `wipe(): void`
  - `limited(ip: string): boolean`, `hit(ip: string): void`: 15 wrong passcodes in 10 minutes, as in `judge-store.ts`
- `handleRecruitApi(request: Request, env: RecruitEnv): Promise<Response>`, where `RecruitEnv = { RECRUIT_STORE?: DurableObjectNamespace<RecruitStore>; RECRUIT_ADMIN_PASSCODE?: string; RECRUIT_JUDGE_PASSCODE?: string }`. The store comes from `idFromName("core-2026")`.
- Routes (all JSON, `cache-control: no-store`):
  - `GET judge/check`
  - `GET judge/candidates?squad=&judge=`: returns `{ candidates: JudgeView[] }` filtered by `canJudge`, plus `{ mine: Sheet[] }` for that judge only, and `{ locked }`
  - `PUT judge/sheet`: 403 if `!canJudge`, 423 if locked, 404 if the student is unknown
  - `GET admin/check`, `GET admin/list` → `{ candidates, sheets, locked }`
  - `POST admin/add {rows}`: at most 2000 rows, each checked with `validateCandidate`, with the row number in the error
  - `PUT admin/candidate?id=`, `DELETE admin/candidate?id=`, `PUT admin/status?id= {status}`, `PUT admin/lock {locked}`
  - `DELETE admin/all {confirm: "DELETE"}`
  - A missing secret gives 503 with a message naming it. A wrong passcode gives 401, and too many tries give 429.

- [ ] **Step 1: Write failing tests** against `handleRecruitApi` with the fake store:
  - a wrong judge passcode gives 401
  - the admin passcode on `judge/*` gives 401, and the judge passcode on `admin/*` gives 401
  - a Design judge `PUT judge/sheet` for an Events student gives 403
  - Teacher on the same student gives 200
  - saving twice for the same judge (`"Brunda"`, then `"brunda "`) leaves one sheet
  - `judge/candidates` JSON has no `phone` or `email` anywhere
  - after `PUT admin/lock {locked:true}`, a sheet save gives 423
  - re-adding a USN whose status is `core` keeps `core` and counts as `updated:1`
  - `DELETE admin/all` without `confirm:"DELETE"` gives 400
  - a missing `RECRUIT_JUDGE_PASSCODE` gives 503
- [ ] **Step 2: Run** `npx vitest run src/server/recruit-api.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the store and API.** Then wire `server.ts` and `wrangler.jsonc`. Reuse the timing-safe `same()` compare; copy it locally the way `cert-api.ts` does.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all tests pass, including the existing 65.
- [ ] **Step 5: Commit** `feat: recruitment store and api`.

### Task 5: Admin page `/recruit/admin`

**Files:**
- Create: `src/routes/recruit.admin.tsx`
- Modify: `src/routeTree.gen.ts`, regenerated by the router plugin on `npm run build`

**Interfaces:**
- Consumes: `recruitApi`, `readRecruitCsv`, `validateCandidate`, `summarize`, `rankSquad`, `coreCount`, `resultsCsv`, `SQUADS`, `DAYS`, `CORE_CAP`, `BRANCHES`, and the `Window` component from `@/components/site/parts`.
- Head: title `Recruitment admin | RO-BIO`, `robots: noindex, nofollow`. The passcode is kept in `sessionStorage` under `robio-recruit-admin`.
- Sections, in order:
  1. Passcode
  2. Import CSV: file input, a preview table with problems shown per row, and an "Add N students" button
  3. Add one student: the wildcard form
  4. Counts: squad by day
  5. Results: one tab per squad, with rank, name, branch, sem, average, judges (a warning when under 2), the five criterion averages, notes, a status select and a "Core: x of 15" counter that turns red above 15
  6. All students: search, edit, remove
  7. Lock marking toggle, export results CSV, delete all data (type DELETE to confirm)

- [ ] **Step 1: Build the page.** Load the existing `admin.certificates.tsx` first and match its structure and styles.
- [ ] **Step 2: Run** `npm run build`. Expected: success, and `routeTree.gen.ts` includes `/recruit/admin`.
- [ ] **Step 3: Check it by hand.** Start `npm run dev` with `.dev.vars` holding both passcodes, then use Playwright at 390px and 1280px width:
  - import a 6-row fixture CSV
  - add a wildcard student
  - change a status
  - the counter updates
  - a screenshot shows no sideways scrolling
- [ ] **Step 4: Commit** `feat: recruitment admin page`.

### Task 6: Judge page `/recruit/judge`

**Files:**
- Create: `src/routes/recruit.judge.tsx`
- Modify: `src/routeTree.gen.ts` (regenerated)

**Interfaces:**
- Consumes: `recruitApi`, `CRITERIA`, `SQUADS`, `DAYS`, `ROOMS`, `weightedTotal`, `JudgeView`, `Sheet`.
- Head: `robots: noindex`. The login (passcode, name, squad) is kept in `localStorage` under `robio-recruit-judge`, wrapped in try/catch, the way `judging.ts` does it.
- Flow:
  1. Sign in with passcode, name and squad (or "Teacher (all squads)").
  2. Pick the day, then search by name or USN. Students already marked are ticked.
  3. Tick up to 4 students, then tap "Mark this group".
  4. A card per student shows five rows of 1 to 5 buttons. Tapping a criterion title shows its low, mid and high text. Each card has a note box, shows a live total out of 100, and has a Save button.
  5. If the admin has locked marking, a banner says so and Save is disabled.
- Other judges' marks are never shown.

- [ ] **Step 1: Build the page**, following `events.robo-spark.judge.tsx` for its look and how it signs in.
- [ ] **Step 2: Run** `npm run build`. Expected: success.
- [ ] **Step 3: Check it by hand at 390px:**
  - sign in as a Design senior and see only Design students
  - mark a group of 2, reload, and the marks are still there
  - sign in as Teacher and see all students
  - the admin results show the averages
- [ ] **Step 4: Commit** `feat: recruitment judge page`.

### Task 7: Privacy page, setup notes and zip

**Files:**
- Modify: `src/routes/privacy.tsx`. Add a "Core member recruitment" paragraph: the club stores applicants' name, USN, email, WhatsApp number, branch, semester and squad choices, and judges' marks. Only the club's admins and judges can see them, behind passcodes. They are used only for selection, and deleted after recruitment ends. Change line 25's "no forms" sentence so it stays true. The site's public pages still have no forms.
- Create: `recruitment/README.md`:
  1. Copy the zip over your local Ro-Bio folder, then commit and push with GitHub Desktop.
  2. In Cloudflare, add `RECRUIT_ADMIN_PASSCODE` and `RECRUIT_JUDGE_PASSCODE` under Settings, Variables and Secrets.
  3. Open `/recruit/admin`, import the Sheet's CSV (File, Download, CSV).
  4. Share `/recruit/judge` and the judge passcode with the judges.
  5. After results, export the CSV and press "delete all data".
- Output: `/home/user/Ro-Bio-recruitment.zip`.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Run** `npm run lint && npx vitest run && npm run build`. Expected: all pass.
- [ ] **Step 3: Check** for dashes: `git diff main --name-only | xargs grep -l $'\u2014\|\u2013'` prints nothing.
- [ ] **Step 4: Commit** `docs: recruitment privacy note and setup`.
- [ ] **Step 5: Build the zip** from `git diff --name-only main...HEAD`, keeping folder paths. Check `unzip -l` lists every changed file, and nothing from `node_modules`, `.dev.vars` or `dist`.
