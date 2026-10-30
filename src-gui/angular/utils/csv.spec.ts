import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d\r\n");
  });

  it("quotes cells containing commas, quotes or line breaks", () => {
    expect(toCsv([['Smith, "Jo"', "line\nbreak"]])).toBe('"Smith, ""Jo""","line\nbreak"\r\n');
  });

  it("writes null and undefined as empty cells", () => {
    expect(toCsv([[null, undefined, 0]])).toBe(",,0\r\n");
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx"])(
    "neutralizes a cell that a spreadsheet would run as a formula: %p",
    (value) => {
      expect(toCsv([[value]]).startsWith("'") || toCsv([[value]]).startsWith(`"'`)).toBe(true);
    },
  );

  it("leaves ordinary values untouched", () => {
    expect(toCsv([["jane@example.com", "Engineering"]])).toBe("jane@example.com,Engineering\r\n");
  });
});
