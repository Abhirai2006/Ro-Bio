# Setting up the recruitment form

About 10 minutes. You do not need to write any code.

## 1. Make the form

1. Sign in to Google as **ro.bio.muse@gmail.com**. The confirmation emails are sent from the account that runs the script.
2. Open **https://script.google.com** and click **New project**.
3. Delete everything in the editor (the empty `myFunction`).
4. Open `Code.gs` from this folder, copy all of it, and paste it into the editor.
5. Click the project name at the top ("Untitled project") and call it `RO-BIO Recruitment`.
6. Click the clock icon on the left, **Project Settings**, and set **Time zone** to `(GMT+05:30) India Standard Time`.
7. Go back to the editor (`< >` icon). In the function box at the top, pick **setup**, then click **Run**.
8. Google asks for permission. Click **Review permissions**, pick ro.bio.muse@gmail.com, then **Advanced**, then **Go to RO-BIO Recruitment (unsafe)**, then **Allow**. "Unsafe" only means Google has not reviewed your own script.
9. When it finishes, open **Execution log** at the bottom. It shows two links:
   - **Form link to share:** send this one to students.
   - **Response Sheet:** keep this for the club.

Running **setup** again does not make a second form. It only prints the link again.

## 2. Check the form before sharing

1. Open the form link and fill it in once yourself, with your own email.
2. In the response Sheet, check:
   - **Form Responses 1** has your row, and the **Assigned day** column at the end is filled in.
   - **Email queue** has your row with an empty Status.
   - **Summary** counts you under your squad.
3. Within an hour your Status changes to `Sent ...` and the email arrives. To test it straight away, run **sendQueued** from the editor.
4. Delete your test row from **Form Responses 1** and from **Email queue**.

## 3. What happens by itself

| When | What |
|---|---|
| Every new response | The student gets a day if they chose "Either day is fine", and joins the email queue |
| Every hour | Up to 15 queued emails are sent. It stops a little before Gmail's daily limit (about 100 a day on a normal account) and carries on the next day |
| Tue 10 Nov, 6 pm | The form closes itself |

A student who submits twice before their email goes out gets one email with their latest answers.

## 4. Things to watch

- **Summary tab:**
  - **Waiting for email:** how many confirmations have not gone out yet. If it is still high on Tuesday night, send those students their day by WhatsApp. The queue tab has their names and days.
  - **Emails that failed:** usually a mistyped address. Fix the address in the Email queue tab and clear the Status cell. It is tried again within the hour.
- **To close the form early,** run **closeForm**. To reopen it, open the form, go to **Responses**, and turn on **Accepting responses**.
- **Do not rename the questions.** The website reads the response Sheet by these headings.

## 5. Moving responses to the website

After the form closes:

1. Open the response Sheet and click the **Form Responses 1** tab.
2. Click **File**, **Download**, **Comma separated values (.csv)**.
3. Upload that file on the website at `/recruit/admin`.
