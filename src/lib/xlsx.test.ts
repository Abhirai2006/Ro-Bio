import { describe, expect, it } from "vitest";
import { crc32, xlsxFile, zipStore } from "./xlsx";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Reads a stored (uncompressed) zip back into its files, checking every checksum on the way. */
function unzip(bytes: Uint8Array): Record<string, string> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Record<string, string> = {};
  let at = 0;
  while (v.getUint32(at, true) === 0x04034b50) {
    expect(v.getUint16(at + 8, true)).toBe(0);
    const crc = v.getUint32(at + 14, true);
    const size = v.getUint32(at + 18, true);
    const nameLen = v.getUint16(at + 26, true);
    const name = dec.decode(bytes.subarray(at + 30, at + 30 + nameLen));
    const data = bytes.subarray(at + 30 + nameLen, at + 30 + nameLen + size);
    expect(crc32(data), name).toBe(crc);
    out[name] = dec.decode(data);
    at += 30 + nameLen + size;
  }
  expect(v.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  expect(v.getUint16(bytes.length - 12, true)).toBe(Object.keys(out).length);
  return out;
}

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("zipStore", () => {
  it("stores files that read back exactly", () => {
    const files = unzip(zipStore([{ name: "a.txt", data: enc.encode("hello") }]));
    expect(files).toEqual({ "a.txt": "hello" });
  });
});

describe("xlsxFile", () => {
  it("has the parts Excel and Google Sheets need", () => {
    const parts = unzip(xlsxFile([["Name"], ["Asha"]], "Mail list"));
    expect(Object.keys(parts).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(parts["xl/workbook.xml"]).toContain('name="Mail list"');
  });

  it("keeps every cell as text, escaped, with the heading row bold", () => {
    const sheet = unzip(
      xlsxFile(
        [
          ["Name", "WhatsApp"],
          ["A & B <x>", "09000000001"],
        ],
        "S",
      ),
    )["xl/worksheets/sheet1.xml"]!;
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(sheet).toContain("A &amp; B &lt;x&gt;");
    expect(sheet).toContain('<c r="B2" t="inlineStr"><is><t xml:space="preserve">09000000001</t>');
    expect(sheet).toContain('state="frozen"');
  });

  it("names columns past Z", () => {
    const row = Array.from({ length: 28 }, (_, i) => String(i));
    expect(unzip(xlsxFile([row], "S"))["xl/worksheets/sheet1.xml"]).toContain('r="AB1"');
  });
});
