# Core member recruitment, November 2026

Everything for picking about 15 new core members from 1st and 3rd semester, on Wed 11 and Thu 12 Nov 2026.

| File | What it is |
|---|---|
| `form/Code.gs` | The Apps Script that builds the Google Form, its response Sheet and the hourly email queue |
| `form/SETUP.md` | How to run it, step by step |
| `judges-handbook.html` | The run sheet, criteria, rules and question bank. Open it in a browser, or print it |
| `messages.md` | WhatsApp and Instagram text: the announcement, the reminder, the results and the induction |

The website part is two private pages:

- **`/recruit/admin`**: import the form responses, add wildcard entries, see results by squad, tag students Core, Supporting or Not selected, export the results and delete the data afterwards.
- **`/recruit/judge`**: judges mark students on their phones.

Neither page is in the menu or the sitemap, and search engines are told not to list them.

## 1. Put the changes on the website

1. In GitHub Desktop, open the Ro-Bio repository, click **Fetch origin**, then **Pull** if it offers to. Your copy must match GitHub before you add these files.
2. Unzip `Ro-Bio-recruitment.zip`. Copy everything inside it into your Ro-Bio folder, and say **Replace** when asked. Every file goes to the same folder it has in the zip.
3. Back in GitHub Desktop you should see the changed files. Write a summary like `Core member recruitment`, click **Commit to main**, then **Push origin**.
4. Cloudflare builds and deploys it by itself, usually within a few minutes. Watch it under Workers & Pages, ro-bio, Deployments.

## 2. Add the two passcodes in Cloudflare

Do this once. Until you do, both pages say the passcode is not set up yet.

1. Cloudflare dashboard, **Workers & Pages**, **ro-bio**, **Settings**, **Variables and Secrets**.
2. Click **Add**, choose type **Secret**:
   - Name `RECRUIT_ADMIN_PASSCODE`, value: a passcode only the admins know.
   - Name `RECRUIT_JUDGE_PASSCODE`, value: a different passcode for all the judges.
3. Click **Deploy** (or Save and deploy).

Use passcodes that are hard to guess, and different from the Robo Spark ones. After 15 wrong tries from one network, that network is locked out for 10 minutes. Judges on the college Wi-Fi share one network, so ask them to type the passcode carefully, or use mobile data.

## 3. On the days

| When | What to do |
|---|---|
| Sun 8 Nov | Run the form script (`form/SETUP.md`). Send the announcement from `messages.md` |
| Tue 10 Nov, 6 pm | The form closes by itself |
| Tue 10 Nov, evening | In the response Sheet: File, Download, CSV. Upload it on `/recruit/admin`. Check the Numbers box: any squad above 20 on a day needs two panels |
| Tue 10 Nov, evening | Share the handbook and give judges the link `/recruit/judge` and the judge passcode, in person or by private message |
| Wed 11 and Thu 12 Nov | Interviews, 4 to 5 pm, G-07 and G-09. An organiser at each door checks arriving students on `/recruit/admin`, Every student (search by name or USN), and sends them to their squad's corner |
| After the interviews | Selection meeting on `/recruit/admin`, Results box. Then lock marking and download the results |
| After results are out | Press **Delete everything** on `/recruit/admin`. The form promised students this |

Students who send the form late, or come without filling it in, can be added on the admin page under **Add one student**.

## 4. If something goes wrong

- **"The passcode is not set up yet"**: step 2 above is not done, or the deploy after it has not finished.
- **"Recruitment storage is not connected"**: the `wrangler.jsonc` in the zip did not get copied. Copy it again and push.
- **A judge's phone loses signal:** marks that were not saved stay on that phone. Tap Save again when it is back online. If the page will not load at all, mark on paper with the USN and enter it after the session.
- **A student is in the wrong squad:** on the admin page, Every student, Edit, change First choice squad.
