# Core member recruitment, November 2026: design

Status: draft for the club to approve. Items marked **(Claude's call)** were filled in by Claude and can be changed.

## 1. Why we are doing this

RO-BIO's current core team (30 students) is in 4th and 6th sem. The club wants a new batch from **1st and 3rd sem**, from **every branch**, before **Bot Forge on Wed 18 Nov 2026**, so the new members can help run it.

More than 100 students are expected to apply. The club wants the selection to feel serious and fair, so judges need shared criteria and a proper way to record marks.

## 2. Goals, non-goals, anti-goals

**Goals**
- Select about **14 to 15 core members**, **2 to 3 per squad**, across five squads: Projects, Events, Technical, Social Media and Outreach, Design. Office Bearers is not recruiting.
- Pick the **best people overall**. No branch quota and no fixed 1st/3rd sem split.
- Every student is marked by **2 to 3 judges** using the same criteria.
- Quietly identify **supporting members** during judging.

**Non-goals**
- No branch or semester quotas.
- No essay questions on the form. It collects details and interests only.
- This is not Bot Forge registration. Bot Forge stays "coming soon" on the site (project rule in AGENTS.md).

**Anti-goals** (a failure even if everything technically works)
- Students hear about "supporting members" before results. Everyone applies and is interviewed as a core candidate.
- Judges mark friends higher, or copy each other's marks.
- More than about 15 core members get selected. The club said more would be hard to manage.
- Applicants' names, USNs or phone numbers end up in the public GitHub repo or on a public page.
- A popular squad cannot finish its interviews in the time available.

## 3. Constraints

- **Interviews:** Wed 11 Nov and Thu 12 Nov 2026, 4 to 5 pm, both days. Each student comes on one day.
- **Judges:** 2 teachers, plus 2 to 3 seniors from each squad.
- **Website:** Cloudflare Workers, TanStack Start, Durable Object SQLite stores, passcodes kept as Cloudflare secrets. This is the same setup as the Robo Spark judge page and the certificates admin.
- **Repo rules (AGENTS.md):** no em dashes or en dashes anywhere; club facts stay in `src/lib/site.ts`; keep `package-lock.json` committed.
- **Venue:** Second year block, rooms **G-07** and **G-09**. Two rooms hold five panels.
- **Google account:** the form and emails run from **ro.bio.muse@gmail.com**, a personal Gmail. Apps Script can send only about 100 emails a day from it, so emails go out in hourly batches (see Part 1).
- **Delivery:** Claude hands over a zip of the changed files. The club copies them into its local repo, commits and pushes with GitHub Desktop, and Cloudflare deploys `main` automatically. No pull request.

## 4. Approaches considered

Two days at one hour each gives 2 hours in total for 100+ students. That limit decides how the interviews run.

| | Approach | Trade-off |
|---|---|---|
| A | One-on-one interviews, five squad panels in parallel, about 5 minutes each | Most personal. Fails if one squad gets more than about 20 applicants a day. |
| **B** | **Small-group interviews, panels in parallel, groups of 4, about 12 minutes per group** | Fits about 40 students per squad over the two days, whatever the numbers. Tests communication directly. Slightly less personal. |
| C | Choose A or B per squad after the form closes | Fits each squad's numbers, but two formats confuse judges and can feel unfair. |

**The club picked B.**

## 5. Decided by the club

- The form collects basic details and squad interest only.
- Best people overall, from all 7 branches.
- Each squad's seniors mark only the students who chose that squad. Teachers mark anyone.
- Design applicants get a design topic and design something.
- The interview is a face-to-face personal interview that also tests communication.
- Supporting members are decided at judging time and are never mentioned beforehand.
- Marks are given on a new recruitment section of the website, not on paper.
- The admin can add students in bulk, and add wildcard entries one at a time, without writing code.

## 6. Part 1: Google Form, built by an Apps Script

A single Apps Script file. The club pastes it into script.google.com and presses Run once.

**What it creates**
- A Google Form, "RO-BIO Core Member Recruitment 2026", linked to a new response Sheet.
- A "Summary" tab in the Sheet that counts applicants per squad per day (formulas, updated live).
- An on-submit trigger that emails each applicant a confirmation.

**Form questions** (all required unless marked)
1. Email
2. Full name
3. USN
4. WhatsApp number **(Claude's call: so the club can contact students about slots and results)**
5. Branch: dropdown of the 7 branches
   - Artificial Intelligence & Data Science
   - Artificial Intelligence & Machine Learning
   - Biomedical and Robotic Engineering
   - Electronics and Communication Engineering
   - Civil Environmental Engineering
   - Computer Science & Design
   - Computer Science & Engineering
6. Semester: 1st, 3rd
7. First choice squad: one of the five squads, with a one-line description of each
8. Second choice squad (optional): the five squads, or "No second choice"
9. Interview day: Wed 11 Nov, Thu 12 Nov, or "Either day is fine"
10. Consent tick: "My details will be used only for RO-BIO recruitment and deleted afterwards."

**Confirmation email**
- Sent from ro.bio.muse@gmail.com.
- Says: interview day, 4 to 5 pm, Second year block, room (G-07 or G-09, depending on the student's first choice squad), arrive by 3:45 pm, bring college ID.
- Design applicants are also told to bring a pen and paper, or a phone or laptop with any design app. The topic is given on the spot.
- "Either day" students are put on whichever day has fewer applicants at that moment, and the email says which day. **(Claude's call: keeps the two days balanced without capping the form.)**
- **Sent in batches, not instantly:**
  - Each new response joins an "Email queue" tab.
  - A timer sends up to 15 emails an hour, and stops for the day before Gmail's daily limit (it checks the remaining allowance first).
  - Each row is marked "Sent" with the time, so no one is emailed twice.
- **Backup for late students:**
  - The form's own submit page shows the date, time, venue and the room for each squad. Students who picked a day know it straight away.
  - Only "Either day" students rely on the email to learn their day.
  - The Summary tab shows how many are still waiting for an email. If many are still waiting on Tuesday night, the club sends their day by WhatsApp.

**Form closes:** Tue 10 Nov, 6 pm **(Claude's call)**. The club closes it by hand in Google Forms, or the script can close it automatically at that time.

## 7. Part 2: How the interview day runs (approach B)

- Five panels run at the same time, one per squad, in two rooms:
  - **G-07:** Technical, Projects and Design. Design applicants sketch at the back benches while they wait.
  - **G-09:** Events, and Social Media and Outreach.
  - Each panel takes its own corner of the room. **(Claude's call: the more hands-on squads share one room, the talking-heavy squads the other. Swap freely.)**
- Students join their **first choice** squad's queue in arrival order and are called in groups of 4.

**Each group, about 12 minutes**
1. Each student introduces themselves and answers 2 personal questions from the question bank. About 2 minutes each.
2. The group gets one short discussion question. About 4 minutes.
3. Judges mark on their phones during the session or right after it, before the next group comes in.

**Design applicants**
- They get one design topic as they arrive and sketch for about 15 minutes while they wait.
- They present their design in 1 minute during their group's time, in place of one personal question.

**Teachers**
- Teachers move between panels and mark the groups they watch.
- Every student should still end up with at least 2 marks sheets: the squad's 2 to 3 seniors, plus a teacher where possible.

**If a squad gets too many applicants:** when one squad has more than 20 students on one day, its seniors split into two panels, or groups grow to 5. The website shows the counts after the form closes, so the club can decide on Tuesday evening. **(Claude's call)**

**Handbook:** a printable judges' handbook covers the run sheet, the criteria and the question bank. Each squad gets 6 to 8 personal questions, 4 group questions and 3 design topics, some of them about Bot Forge.

## 8. Part 3: Judging criteria

Each judge marks every student on **5 criteria**, each on a **1 to 5 scale**. The website multiplies each mark by the criterion's weight to get a total out of 100. The final score is the average of all judges' totals.

| # | Criterion | Weight | 1 (weak) | 3 (okay) | 5 (strong) |
|---|---|---|---|---|---|
| 1 | Communication | x4 (20) | Hard to follow, or barely speaks | Clear but short, needs prompting | Clear, organised, confident, answers what was asked |
| 2 | Teamwork in the group question | x4 (20) | Silent, or talks over others | Makes their own point, ignores others | Builds on others, brings in quiet people, helps the group conclude |
| 3 | Interest and commitment | x4 (20) | Vague reason, cannot give time | Interested, partly available | Specific reasons, clear about time for Saturday sessions and events, has already tried something related |
| 4 | Squad skill (see below) | x6 (30) | No real attempt | A reasonable but ordinary answer | Original, practical, well explained |
| 5 | Attitude and learning | x2 (10) | Defensive or uninterested | Polite, open | Curious, takes a hint or feedback and improves the answer on the spot |

**What "squad skill" means for each squad.** Judge how they think, not what they already know. 1st sem students have only had a few months of college.

| Squad | What to look for |
|---|---|
| Projects | Can turn an idea into steps: what to build first, what parts are needed, what could go wrong |
| Events | Plans and handles problems: running a session, a speaker arriving late, a crowd at registration |
| Technical | Problem-solving approach and curiosity about how things work, for example how a line-following robot might decide where to turn |
| Social Media and Outreach | Can write a short caption or pitch for the club, knows what makes people stop scrolling |
| Design | The design task: a clear idea, readable layout, fit with the topic, and how well they explain it |

**Rules for judges**
- Mark on your own. Do not discuss or look at another judge's marks until you have saved yours. The website does not show other judges' marks.
- If you know a student personally (friend, roommate, relative, same class group), say so and skip marking them. Another judge covers them.
- Do not give or take marks for branch, semester, or knowing seniors in the club.
- Use the whole scale. A 3 is a normal, decent answer, not a bad one.
- Write a one-line note for anyone you would strongly pick, or strongly not pick.

**Selection**
- Within each squad, students are ranked by average score.
- The squad's seniors and a teacher pick **2 to 3 as core**. The whole selection is capped at about 15.
- **Supporting members:** the next few students who showed real interest, chosen by the same group. They are never told this beforehand.
- **Tie-break:** higher squad skill average, then higher interest and commitment, then the squad head decides.
- A strong student the first choice squad did not pick can be offered to their second choice squad if that squad agrees.
- Any student with fewer than 2 marks sheets is flagged, and gets another judge before decisions are made.

## 9. Part 4: Website recruitment section

New pages, not linked from the menu, marked `noindex`, and left out of the sitemap:

**`/recruit/admin`** (admin passcode)
- **Import:** download the response Sheet as CSV and upload it. Students are matched by USN, so importing again updates existing rows and does not create duplicates.
- **Add one student:** a short form for wildcard entries, ticked as "wildcard".
- **Edit or remove** any student.
- **Counts:** applicants per squad per day.
- **Results:** each squad's students sorted by average, showing:
  - average for each criterion
  - number of judges, with a warning when there are fewer than 2
  - judges' notes
  - a status for each student: Core, Supporting, Not selected, or Undecided
  - a running "Core: x of 15" counter
- **Export:** results as CSV, for the announcement and later the Team page.
- **Delete all recruitment data:** a button for after recruitment ends. **(Claude's call, matches the consent line on the form)**

**`/recruit/judge`** (judge passcode)
- **Sign in:** passcode, your name, and your squad, or "Teacher (all squads)".
- **Find students:** pick the day, search by name or USN, and see only your squad's students (teachers see everyone). Students you have already marked are ticked.
- **Mark a group:** tick up to 4 students. They appear side by side, each with the 5 criteria as tap buttons from 1 to 5 and a note box. Tapping a criterion shows its 1, 3 and 5 descriptions. Save marks each student.
- **Change marks:** judges can change their own marks until the admin locks marking. They never see other judges' marks.
- Built for phones first.

**Storage and secrets**
- A new Durable Object `RecruitStore` (SQLite) holds a candidates table and a scores table, with a primary key of (candidate, judge).
- It has the same wrong-passcode lockout as the Robo Spark judge page.
- Two new Cloudflare secrets, separate from Robo Spark: `RECRUIT_ADMIN_PASSCODE` and `RECRUIT_JUDGE_PASSCODE`.
- Applicant data lives only in that store, never in the repo.

**Also changed**
- The privacy page gets a short paragraph saying recruitment data is kept only for selection and deleted afterwards.
- Unit tests for the scoring maths, the CSV import and input checks, following the repo's existing vitest tests.

## 10. Part 5: Messages

- **Announcement:** WhatsApp message for class groups and CRs, and an Instagram caption, both with the form link and the deadline.
- **Results, three templates:**
  - Selected as core member
  - Invited as supporting member: "we'd love you to work with the X squad"
  - Not selected this time, which thanks them and invites them to Bot Forge and Saturday sessions
- **Induction:** a short message for new members with the induction time and their squad's WhatsApp group.

## 11. Timeline

| When | What |
|---|---|
| Sat 7 Nov | Design approved |
| Sun 8 Nov | Form live, announcement sent |
| Mon 9 Nov | Website section live, handbook shared with judges |
| Tue 10 Nov, 6 pm | Form closes |
| Tue 10 Nov, evening | Import applicants, check counts, brief judges |
| Wed 11 and Thu 12 Nov, 4 to 5 pm | Interviews |
| Thu 12 Nov after 5 pm, or Fri 13 Nov | Selection meeting using the results page |
| Fri 13 or Sat 14 Nov | Results sent, induction |
| Wed 18 Nov | Bot Forge |

## 12. Left to the builder

- Exact page layout and styling. It should follow the existing Robo Spark judge page and the certificates admin (`Window` component, same look).
- Wording of questions and messages, reviewed by the club before use.

## 13. Open questions for the club

See the message that came with this document.
