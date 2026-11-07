/**
 * RO-BIO core member recruitment, November 2026.
 *
 * What this does:
 *   setup()       Run once. Builds the Google Form, its response Sheet, a Summary tab and an
 *                 Email queue tab, and turns on the timers. Safe to run again: it will not make a second form.
 *   onSubmit(e)   Runs by itself on every new response. Gives "Either day" students a day and
 *                 puts a confirmation email in the queue.
 *   sendQueued()  Runs by itself every hour. Sends up to 15 queued emails, never past Gmail's daily limit.
 *   closeForm()   Runs by itself on Tue 10 Nov 2026 at 6 pm. You can also run it by hand.
 *
 * How to use it: see SETUP.md next to this file.
 * Run it while signed in as ro.bio.muse@gmail.com, so the emails come from the club account.
 */

var CONFIG = {
  title: "RO-BIO Core Member Recruitment 2026",
  squads: ["Projects", "Events", "Technical", "Social Media and Outreach", "Design"],
  squadInfo: {
    Projects: "Plan and build the club's projects, from an idea to a working prototype.",
    Events: "Organise and run events like Bot Forge: planning, people, timing and on-the-day problems.",
    Technical: "Robots, circuits, sensors and code. Curiosity matters more than what you already know.",
    "Social Media and Outreach": "Tell the club's story on Instagram and LinkedIn, write posts and reach students.",
    Design: "Posters, logos, certificates and social media graphics. You will get a small design task at the interview.",
  },
  rooms: {
    Projects: "G-07",
    Technical: "G-07",
    Design: "G-07",
    Events: "G-09",
    "Social Media and Outreach": "G-09",
  },
  branches: [
    "Artificial Intelligence & Data Science",
    "Artificial Intelligence & Machine Learning",
    "Biomedical and Robotic Engineering",
    "Electronics and Communication Engineering",
    "Civil Environmental Engineering",
    "Computer Science & Design",
    "Computer Science & Engineering",
  ],
  days: ["Wed 11 Nov", "Thu 12 Nov"],
  either: "Either day is fine",
  noSecond: "No second choice",
  time: "4 to 5 pm",
  arrive: "3:45 pm",
  block: "Second year block",
  closeAt: "2026-11-10T18:00:00+05:30",
  closeText: "Tue 10 Nov, 6 pm",
  perHour: 15,
  spare: 5,
  instagram: "@ro_bio_hub",
};

// The question titles. The website reads the response Sheet by these headings, so do not rename them.
var Q = {
  email: "Email address",
  name: "Full name",
  usn: "USN",
  phone: "WhatsApp number",
  branch: "Branch",
  sem: "Semester",
  first: "First choice squad",
  second: "Second choice squad",
  day: "Interview day",
  consent: "Consent",
  assigned: "Assigned day",
};

var QUEUE = "Email queue";
var SUMMARY = "Summary";

/* ---------- Pure helpers (tested in src/lib/recruit-form-script.test.ts) ---------- */

/** The room for a squad's interview panel. */
function roomFor(squad) {
  return CONFIG.rooms[squad] || "G-07";
}

/** The day with fewer students so far. Wednesday wins a tie. */
function pickDay(wed, thu) {
  return thu < wed ? CONFIG.days[1] : CONFIG.days[0];
}

/** The day a student is given: their own choice, or the lighter day if they said either. */
function assignDay(answer, wed, thu) {
  return answer === CONFIG.either ? pickDay(wed, thu) : answer;
}

/** How many emails to send this hour, keeping a few of the daily allowance spare. */
function batchSize(remaining) {
  return Math.max(0, Math.min(CONFIG.perHour, remaining - CONFIG.spare));
}

/** The confirmation email for one student. */
function emailFor(r) {
  var lines = [
    "Hi " + r.name + ",",
    "",
    "Thank you for applying to join the RO-BIO core team. We have your application for the " + r.first + " squad.",
    "",
    "Your interview",
    "Day: " + r.day + " 2026",
    "Time: " + CONFIG.time + " (please arrive by " + CONFIG.arrive + ")",
    "Place: " + CONFIG.block + ", room " + roomFor(r.first),
    "",
    "Please bring your college ID.",
  ];
  if (r.first === "Design")
    lines.push(
      "You will get a small design task on the spot. Please bring a pen and paper, or a phone or laptop with any design app you like.",
    );
  lines.push(
    "",
    "The interview is short and friendly: a few questions about you and a small group discussion. You do not need to prepare anything.",
    "",
    "See you there,",
    "RO-BIO, Mysore University School of Engineering",
    "Instagram: " + CONFIG.instagram,
  );
  return { subject: "RO-BIO interview: " + r.day + ", " + CONFIG.time, body: lines.join("\n") };
}

/** The message students see right after they submit. */
function thankYouText() {
  var g07 = CONFIG.squads.filter(function (s) { return roomFor(s) === "G-07"; }).join(", ");
  var g09 = CONFIG.squads.filter(function (s) { return roomFor(s) === "G-09"; }).join(", ");
  return [
    "Thank you, your application is in.",
    "",
    "Interviews: " + CONFIG.days.join(" and ") + ", " + CONFIG.time + ". Please arrive by " + CONFIG.arrive + " on the day you chose and bring your college ID.",
    "Place: " + CONFIG.block + ". Room G-07: " + g07 + ". Room G-09: " + g09 + ". Go to the room of your first choice squad.",
    "If you picked \"" + CONFIG.either + "\", we will email you your day.",
    "Questions? Message us on Instagram " + CONFIG.instagram + ".",
  ].join("\n");
}

/* ---------- Setup ---------- */

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("formId")) {
    var old = FormApp.openById(props.getProperty("formId"));
    Logger.log("The form already exists. Share this link: " + old.getPublishedUrl());
    return;
  }

  var form = FormApp.create(CONFIG.title);
  form.setDescription(
    [
      "RO-BIO, the robotics and biomedical engineering club of Mysore University School of Engineering, is looking for new core members.",
      "Open to 1st and 3rd semester students of every branch.",
      "Interviews: " + CONFIG.days.join(" and ") + ", " + CONFIG.time + ", " + CONFIG.block + ".",
      "Applications close " + CONFIG.closeText + ".",
    ].join("\n\n"),
  );
  if (form.setEmailCollectionType && FormApp.EmailCollectionType)
    form.setEmailCollectionType(FormApp.EmailCollectionType.RESPONDER_INPUT);
  else form.setCollectEmail(true);
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);
  form.setConfirmationMessage(thankYouText());

  form.addTextItem().setTitle(Q.name).setRequired(true);
  form
    .addTextItem()
    .setTitle(Q.usn)
    .setHelpText("As printed on your college ID.")
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern("[A-Za-z0-9 ]{4,20}")
        .setHelpText("Letters and numbers only, like on your ID card.")
        .build(),
    );
  form
    .addTextItem()
    .setTitle(Q.phone)
    .setHelpText("We will use it only to tell you about your interview and results.")
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern("[+]?[0-9 ]{10,15}")
        .setHelpText("Type a 10 digit phone number.")
        .build(),
    );
  form.addListItem().setTitle(Q.branch).setChoiceValues(CONFIG.branches).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.sem).setChoiceValues(["1st", "3rd"]).setRequired(true);

  var info = CONFIG.squads
    .map(function (s) { return s + ": " + CONFIG.squadInfo[s]; })
    .join("\n");
  form
    .addMultipleChoiceItem()
    .setTitle(Q.first)
    .setHelpText(info + "\n\nYou will be interviewed by this squad.")
    .setChoiceValues(CONFIG.squads)
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle(Q.second)
    .setHelpText("Optional. Another squad you would also like to work with.")
    .setChoiceValues(CONFIG.squads.concat([CONFIG.noSecond]))
    .setRequired(false);
  form
    .addMultipleChoiceItem()
    .setTitle(Q.day)
    .setHelpText(CONFIG.time + ", " + CONFIG.block + ". Pick a day you can surely come.")
    .setChoiceValues(CONFIG.days.concat([CONFIG.either]))
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle(Q.consent)
    .setChoiceValues([
      "My details will be used only for RO-BIO recruitment and deleted after recruitment ends.",
    ])
    .setRequired(true);

  var ss = SpreadsheetApp.create(CONFIG.title + " (Responses)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  var resp = responseSheet(ss);
  addAssignedColumn(resp);

  var queue = ss.insertSheet(QUEUE);
  queue.appendRow(["Added", "Email", "Name", "First choice squad", "Day", "Status"]);
  queue.setFrozenRows(1);

  buildSummary(ss, resp, form);

  // Remove the empty "Sheet1" that a new spreadsheet starts with.
  var blank = ss.getSheetByName("Sheet1");
  if (blank && blank.getName() !== resp.getName() && ss.getSheets().length > 1) ss.deleteSheet(blank);

  ScriptApp.newTrigger("onSubmit").forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger("sendQueued").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("closeForm").timeBased().at(new Date(CONFIG.closeAt)).create();

  props.setProperty("formId", form.getId());
  props.setProperty("sheetId", ss.getId());
  Logger.log("Form link to share: " + form.getPublishedUrl());
  Logger.log("Response Sheet: " + ss.getUrl());
}

/** The tab that Google Forms writes responses into. */
function responseSheet(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) if (sheets[i].getFormUrl()) return sheets[i];
  for (var j = 0; j < sheets.length; j++) if (/^Form Responses/.test(sheets[j].getName())) return sheets[j];
  return sheets[0];
}

/** Adds the "Assigned day" heading after the form's own columns, once. Returns its column number. */
function addAssignedColumn(resp) {
  var width = Math.max(resp.getLastColumn(), 1);
  var head = resp.getRange(1, 1, 1, width).getValues()[0];
  var at = head.indexOf(Q.assigned);
  if (at >= 0) return at + 1;
  resp.getRange(1, width + 1).setValue(Q.assigned).setFontWeight("bold");
  return width + 1;
}

function buildSummary(ss, resp, form) {
  var sum = ss.insertSheet(SUMMARY, 0);
  var r = "'" + resp.getName() + "'";
  var col = function (title) {
    return "INDEX(" + r + "!A:AZ,0,MATCH(\"" + title + "\"," + r + "!1:1,0))";
  };
  sum.getRange("A1").setValue("Form link").setFontWeight("bold");
  sum.getRange("B1").setValue(form.getPublishedUrl());
  sum.getRange("A3:D3").setValues([["Squad", CONFIG.days[0], CONFIG.days[1], "Total"]]).setFontWeight("bold");
  CONFIG.squads.forEach(function (s, i) {
    var row = 4 + i;
    sum.getRange(row, 1).setValue(s);
    sum.getRange(row, 2).setFormula("=COUNTIFS(" + col(Q.first) + ",$A" + row + "," + col(Q.assigned) + ",B$3)");
    sum.getRange(row, 3).setFormula("=COUNTIFS(" + col(Q.first) + ",$A" + row + "," + col(Q.assigned) + ",C$3)");
    sum.getRange(row, 4).setFormula("=B" + row + "+C" + row);
  });
  var total = 4 + CONFIG.squads.length;
  sum.getRange(total, 1).setValue("All squads").setFontWeight("bold");
  sum.getRange(total, 2).setFormula("=SUM(B4:B" + (total - 1) + ")");
  sum.getRange(total, 3).setFormula("=SUM(C4:C" + (total - 1) + ")");
  sum.getRange(total, 4).setFormula("=SUM(D4:D" + (total - 1) + ")");
  sum.getRange(total + 2, 1).setValue("Waiting for email").setFontWeight("bold");
  sum.getRange(total + 2, 2).setFormula("=COUNTIFS('" + QUEUE + "'!B2:B,\"<>\",'" + QUEUE + "'!F2:F,\"\")");
  sum.getRange(total + 3, 1).setValue("Emails that failed").setFontWeight("bold");
  sum.getRange(total + 3, 2).setFormula("=COUNTIF('" + QUEUE + "'!F2:F,\"Failed*\")");
  sum.autoResizeColumn(1);
}

/* ---------- Runs by itself ---------- */

/** On each new response: give a day, then queue one confirmation email. */
function onSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("sheetId"));
    var resp = e && e.range ? e.range.getSheet() : responseSheet(ss);
    var row = e && e.range ? e.range.getRow() : resp.getLastRow();
    var aCol = addAssignedColumn(resp);
    var v = function (title) {
      var nv = (e && e.namedValues) || {};
      var key = Object.keys(nv).filter(function (k) { return k.toLowerCase() === title.toLowerCase(); })[0];
      return key ? String(nv[key][0] || "").trim() : "";
    };

    // Count the days already given, not counting this row.
    var given = resp.getLastRow() > 1 ? resp.getRange(2, aCol, resp.getLastRow() - 1, 1).getValues() : [];
    var wed = 0;
    var thu = 0;
    given.forEach(function (g, i) {
      if (i + 2 === row) return;
      if (g[0] === CONFIG.days[0]) wed++;
      else if (g[0] === CONFIG.days[1]) thu++;
    });
    var day = assignDay(v(Q.day), wed, thu);
    resp.getRange(row, aCol).setValue(day);

    var email = v(Q.email).toLowerCase();
    if (!email) return;
    var first = v(Q.first);
    var name = v(Q.name);
    var queue = ss.getSheetByName(QUEUE);
    var rows = queue.getLastRow() > 1 ? queue.getRange(2, 1, queue.getLastRow() - 1, 6).getValues() : [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][1]).toLowerCase() !== email) continue;
      var status = String(rows[i][5]);
      if (!status) {
        // Not emailed yet: update the waiting row so they get one email with their latest answers.
        queue.getRange(i + 2, 3, 1, 3).setValues([[name, first, day]]);
        return;
      }
      if (status.indexOf("Sent") === 0 && rows[i][3] === first && rows[i][4] === day) return;
    }
    queue.appendRow([new Date(), email, name, first, day, ""]);
  } finally {
    lock.releaseLock();
  }
}

/** Every hour: send a small batch of waiting emails. */
function sendQueued() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("sheetId"));
    var queue = ss.getSheetByName(QUEUE);
    if (queue.getLastRow() < 2) return;
    var n = batchSize(MailApp.getRemainingDailyQuota());
    var rows = queue.getRange(2, 1, queue.getLastRow() - 1, 6).getValues();
    for (var i = 0; i < rows.length && n > 0; i++) {
      if (rows[i][5] || !rows[i][1]) continue;
      var mail = emailFor({ name: rows[i][2], first: rows[i][3], day: rows[i][4] });
      try {
        MailApp.sendEmail({ to: rows[i][1], subject: mail.subject, body: mail.body, name: "RO-BIO" });
        queue.getRange(i + 2, 6).setValue("Sent " + new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
      } catch (err) {
        queue.getRange(i + 2, 6).setValue("Failed: " + err.message);
      }
      n--;
    }
  } finally {
    lock.releaseLock();
  }
}

/** Stops new responses. Runs by itself at the closing time. */
function closeForm() {
  var id = PropertiesService.getScriptProperties().getProperty("formId");
  if (!id) return;
  FormApp.openById(id)
    .setAcceptingResponses(false)
    .setCustomClosedFormMessage("Applications are closed. Follow " + CONFIG.instagram + " on Instagram for results.");
}
