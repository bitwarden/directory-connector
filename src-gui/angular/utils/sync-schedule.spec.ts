import { getNextSyncDue } from "./sync-schedule";

describe("getNextSyncDue", () => {
  const at = (iso: string) => new Date(iso);

  it("should return null when the interval is missing or below the minimum", () => {
    expect(getNextSyncDue(null, null, null)).toBeNull();
    expect(getNextSyncDue(4, at("2026-01-01T00:00:00Z"), null)).toBeNull();
  });

  it("should be due immediately when nothing has synced yet", () => {
    expect(getNextSyncDue(10, null, null)).toEqual(new Date(0));
  });

  it("should be one interval after the only recorded sync", () => {
    expect(getNextSyncDue(10, at("2026-01-01T00:00:00Z"), null)).toEqual(
      at("2026-01-01T00:10:00Z"),
    );
    expect(getNextSyncDue(10, null, at("2026-01-01T00:00:00Z"))).toEqual(
      at("2026-01-01T00:10:00Z"),
    );
  });

  it("should be one interval after the older of the user and group syncs", () => {
    expect(getNextSyncDue(15, at("2026-01-01T00:05:00Z"), at("2026-01-01T00:00:00Z"))).toEqual(
      at("2026-01-01T00:15:00Z"),
    );
  });
});
