// Tests the Google Apps Script that builds the recruitment form. The script is not kept in this repo
// (the club keeps it with its other recruitment papers), so these tests run only when a copy sits at
// recruitment/form/Code.gs, and are skipped otherwise. Apps Script cannot run here, so the file is
// loaded into a plain JavaScript sandbox with small stand-ins for Google's services.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { DAYS, ROOMS, SQUADS } from "@/lib/recruit";

const file = path.resolve(__dirname, "../../recruitment/form/Code.gs");
const present = existsSync(file);
const text = present ? readFileSync(file, "utf8") : "";
const box: Record<string, unknown> = {};
vm.createContext(box);
if (present) vm.runInContext(text, box);
/** A tiny stand-in for one Google Sheet tab: a grid of cells, 1-based like Apps Script. */
class FakeSheet {
  cells: unknown[][];
  constructor(
    public name: string,
    head: unknown[],
  ) {
    this.cells = [head];
  }
  getName() {
    return this.name;
  }
  getFormUrl() {
    return this.name === "Form Responses 1" ? "x" : null;
  }
  getLastRow() {
    return this.cells.length;
  }
  getLastColumn() {
    return Math.max(...this.cells.map((r) => r.length));
  }
  appendRow(row: unknown[]) {
    this.cells.push([...row]);
  }
  getRange(r: number, c: number, nr = 1, nc = 1) {
    const at = (i: number, j: number) => this.cells[r - 1 + i]?.[c - 1 + j] ?? "";
    const put = (i: number, j: number, v: unknown) => {
      while (this.cells.length < r + i) this.cells.push([]);
      this.cells[r - 1 + i]![c - 1 + j] = v;
    };
    const range = {
      getValues: () =>
        Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => at(i, j))),
      setValues: (v: unknown[][]) => {
        v.forEach((row, i) => row.forEach((x, j) => put(i, j, x)));
        return range;
      },
      setValue: (v: unknown) => {
        put(0, 0, v);
        return range;
      },
      setFontWeight: () => range,
      getSheet: () => this,
      getRow: () => r,
    };
    return range;
  }
}

const HEAD = [
  "Timestamp",
  "Email address",
  "Full name",
  "USN",
  "First choice squad",
  "Interview day",
];
function world(quota = 100) {
  const resp = new FakeSheet("Form Responses 1", HEAD);
  const queue = new FakeSheet("Email queue", [
    "Added",
    "Email",
    "Name",
    "First choice squad",
    "Day",
    "Status",
  ]);
  const sent: { to: string; subject: string }[] = [];
  const ss = {
    getSheetByName: (n: string) => (n === "Email queue" ? queue : null),
    getSheets: () => [resp, queue],
  };
  Object.assign(box, {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "sheet" }) },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }),
    },
    SpreadsheetApp: { openById: () => ss },
    MailApp: {
      getRemainingDailyQuota: () => quota - sent.length,
      sendEmail: (m: { to: string; subject: string }) => sent.push(m),
    },
  });
  const submit = (email: string, name: string, first: string, day: string) => {
    resp.appendRow([new Date(), email, name, "4MU24X", first, day]);
    const row = resp.getLastRow();
    (box["onSubmit"] as (e: unknown) => void)({
      range: resp.getRange(row, 1),
      namedValues: {
        "Email address": [email],
        "Full name": [name],
        "First choice squad": [first],
        "Interview day": [day],
      },
    });
  };
  const send = () => (box["sendQueued"] as () => void)();
  return { resp, queue, sent, submit, send };
}
type Fn<A extends unknown[], R> = (...a: A) => R;
const roomFor = box["roomFor"] as Fn<[string], string>;
const pickDay = box["pickDay"] as Fn<[number, number], string>;
const assignDay = box["assignDay"] as Fn<[string, number, number], string>;
const batchSize = box["batchSize"] as Fn<[number], number>;
const emailFor = box["emailFor"] as Fn<
  [{ name: string; first: string; day: string }],
  { subject: string; body: string }
>;

describe.skipIf(!present)("recruitment form script", () => {
  it("sends each squad to its room", () => {
    expect(roomFor("Design")).toBe("G-07");
    expect(roomFor("Technical")).toBe("G-07");
    expect(roomFor("Projects")).toBe("G-07");
    expect(roomFor("Events")).toBe("G-09");
    expect(roomFor("Social Media and Outreach")).toBe("G-09");
  });

  it("puts 'either day' students on the lighter day, Wednesday on a tie", () => {
    expect(pickDay(3, 3)).toBe("Wed 11 Nov");
    expect(pickDay(5, 2)).toBe("Thu 12 Nov");
    expect(assignDay("Either day is fine", 1, 4)).toBe("Wed 11 Nov");
  });

  it("keeps a day the student chose", () => {
    expect(assignDay("Thu 12 Nov", 0, 9)).toBe("Thu 12 Nov");
  });

  it("sends at most 15 an hour and keeps 5 of the daily allowance spare", () => {
    expect(batchSize(100)).toBe(15);
    expect(batchSize(12)).toBe(7);
    expect(batchSize(3)).toBe(0);
  });

  it("tells design applicants the room, time and what to bring", () => {
    const { body, subject } = emailFor({ name: "Asha", first: "Design", day: "Wed 11 Nov" });
    expect(subject).toContain("RO-BIO");
    for (const s of [
      "Asha",
      "Wed 11 Nov",
      "G-07",
      "4 to 5 pm",
      "3:45 pm",
      "pen and paper",
      "college ID",
    ])
      expect(body).toContain(s);
  });

  it("does not ask other squads to bring design tools", () => {
    const { body } = emailFor({ name: "Ravi", first: "Events", day: "Thu 12 Nov" });
    expect(body).toContain("G-09");
    expect(body).not.toContain("pen and paper");
  });

  it("gives 'either day' students the lighter day and writes it in Assigned day", () => {
    const w = world();
    w.submit("a@x.in", "A", "Events", "Wed 11 Nov");
    w.submit("b@x.in", "B", "Events", "Either day is fine");
    expect(w.resp.cells[0]).toContain("Assigned day");
    const col = w.resp.cells[0]!.indexOf("Assigned day");
    expect(w.resp.cells[1]![col]).toBe("Wed 11 Nov");
    expect(w.resp.cells[2]![col]).toBe("Thu 12 Nov");
  });

  it("emails a student who submits twice before sending only once, with the latest answers", () => {
    const w = world();
    w.submit("a@x.in", "A", "Events", "Wed 11 Nov");
    w.submit("A@x.in", "A", "Design", "Wed 11 Nov");
    w.send();
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0]!.to).toBe("a@x.in");
    expect(w.queue.cells[1]![3]).toBe("Design");
  });

  it("does not email again after a repeat submission with the same answers", () => {
    const w = world();
    w.submit("a@x.in", "A", "Events", "Wed 11 Nov");
    w.send();
    w.submit("a@x.in", "A", "Events", "Wed 11 Nov");
    w.send();
    expect(w.sent).toHaveLength(1);
  });

  it("emails again when a student changes their squad after the first email", () => {
    const w = world();
    w.submit("a@x.in", "A", "Events", "Wed 11 Nov");
    w.send();
    w.submit("a@x.in", "A", "Technical", "Wed 11 Nov");
    w.send();
    expect(w.sent).toHaveLength(2);
  });

  it("sends at most one batch an hour and marks each row Sent", () => {
    const w = world();
    for (let i = 0; i < 20; i++) w.submit(`s${i}@x.in`, `S${i}`, "Projects", "Thu 12 Nov");
    w.send();
    expect(w.sent).toHaveLength(15);
    expect(String(w.queue.cells[1]![5])).toMatch(/^Sent /);
    expect(w.queue.cells[16]![5]).toBe("");
    w.send();
    expect(w.sent).toHaveLength(20);
  });

  it("stops before the daily limit", () => {
    const w = world(8);
    for (let i = 0; i < 6; i++) w.submit(`s${i}@x.in`, `S${i}`, "Projects", "Thu 12 Nov");
    w.send();
    expect(w.sent).toHaveLength(3);
  });

  it("finds the response tab by name when Google has not linked it yet", () => {
    const tab = (name: string) => ({ getFormUrl: () => null, getName: () => name });
    const ss = { getSheets: () => [tab("Sheet1"), tab("Form Responses 1")] };
    const found = (box["responseSheet"] as (s: unknown) => { getName(): string })(ss);
    expect(found.getName()).toBe("Form Responses 1");
  });

  it("never mentions supporting members and uses no long dashes", () => {
    expect(text.toLowerCase()).not.toContain("supporting");
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});

/** Runs setup() against stand-ins for Google Forms, Sheets and triggers, and returns every form question made. */
function runSetup() {
  type Call = [string, unknown[]];
  const chain = (calls: Call[], over: Record<string, unknown> = {}): unknown => {
    const proxy: unknown = new Proxy(
      {},
      {
        get: (_t, prop: string) =>
          prop in over
            ? over[prop]
            : (...args: unknown[]) => {
                calls.push([prop, args]);
                return proxy;
              },
      },
    );
    return proxy;
  };
  const items: { kind: string; calls: Call[] }[] = [];
  const addItem = (kind: string) => () => {
    const it = { kind, calls: [] as Call[] };
    items.push(it);
    return chain(it.calls);
  };
  const form = chain([], {
    addTextItem: addItem("text"),
    addListItem: addItem("list"),
    addMultipleChoiceItem: addItem("choice"),
    addCheckboxItem: addItem("checkbox"),
    getPublishedUrl: () => "https://forms.test/f",
    getId: () => "form-id",
  });
  const resp = new FakeSheet("Form Responses 1", HEAD);
  const sheet1 = new FakeSheet("Sheet1", []);
  const tabs: unknown[] = [resp, sheet1];
  const ss = {
    getId: () => "sheet-id",
    getUrl: () => "https://sheets.test/s",
    getSheets: () => tabs,
    getSheetByName: (n: string) => (n === "Sheet1" ? sheet1 : null),
    deleteSheet: () => tabs.splice(tabs.indexOf(sheet1), 1),
    insertSheet: () => chain([]),
  };
  const props = new Map<string, string>();
  Object.assign(box, {
    FormApp: {
      create: () => form,
      createTextValidation: () => chain([]),
      EmailCollectionType: { RESPONDER_INPUT: "RESPONDER_INPUT" },
      DestinationType: { SPREADSHEET: "SPREADSHEET" },
    },
    SpreadsheetApp: { create: () => ss, flush: () => undefined },
    ScriptApp: { newTrigger: () => chain([]) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    Logger: { log: () => undefined },
  });
  (box["setup"] as () => void)();
  const titled = (title: string) =>
    items.find((i) => i.calls.some(([m, a]) => m === "setTitle" && a[0] === title));
  const required = (title: string) =>
    titled(title)?.calls.find(([m]) => m === "setRequired")?.[1][0];
  return { items, titled, required, props, resp };
}

describe.skipIf(!present)("setting up the form", () => {
  it("builds every question and remembers the form", () => {
    const { titled, props } = runSetup();
    for (const t of [
      "Full name",
      "USN",
      "WhatsApp number",
      "Branch",
      "Semester",
      "First choice squad",
      "Second choice squad",
      "Interview day",
      "Consent",
    ])
      expect(titled(t), t).toBeTruthy();
    expect(props.get("formId")).toBe("form-id");
  });

  it("does not require a USN, because 1st semester students do not have one yet", () => {
    const { required, titled } = runSetup();
    expect(required("USN")).toBe(false);
    const help = titled("USN")!.calls.find(([m]) => m === "setHelpText")?.[1][0];
    expect(String(help)).toMatch(/1st semester/);
    expect(required("Full name")).toBe(true);
  });
});

describe.skipIf(!present)("the form script and the website agree", () => {
  it("uses the same squads, rooms and days", () => {
    const config = vm.runInContext("CONFIG", box) as {
      squads: string[];
      rooms: Record<string, string>;
      days: string[];
    };
    expect(config.squads).toEqual([...SQUADS]);
    expect(config.rooms).toEqual(ROOMS);
    expect(config.days).toEqual([...DAYS]);
  });
});
