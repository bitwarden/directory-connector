import { sortGroups, sortUsers } from "./request-sorting";

describe("sortGroups", () => {
  it("should sort groups by externalId", () => {
    const groups = [
      { name: "C", externalId: "c", memberExternalIds: [] as string[] },
      { name: "A", externalId: "a", memberExternalIds: [] as string[] },
      { name: "B", externalId: "b", memberExternalIds: [] as string[] },
    ];

    expect(sortGroups(groups).map((g) => g.externalId)).toEqual(["a", "b", "c"]);
  });

  it("should sort by name when externalIds match", () => {
    const groups = [
      { name: "B", externalId: "a", memberExternalIds: [] as string[] },
      { name: "A", externalId: "a", memberExternalIds: [] as string[] },
    ];

    expect(sortGroups(groups).map((g) => g.name)).toEqual(["A", "B"]);
  });

  it("should sort member external ids within each group", () => {
    const groups = [{ name: "A", externalId: "a", memberExternalIds: ["u3", "u1", "u2"] }];

    expect(sortGroups(groups)[0].memberExternalIds).toEqual(["u1", "u2", "u3"]);
  });

  it("should produce the same result regardless of input order", () => {
    const build = (order: number[]) =>
      order.map((i) => ({
        name: `G${i}`,
        externalId: `g${i}`,
        memberExternalIds: [`u${i}`, `u${i + 1}`].reverse(),
      }));

    expect(sortGroups(build([3, 1, 2]))).toEqual(sortGroups(build([1, 2, 3])));
  });
});

describe("sortUsers", () => {
  it("should sort users by externalId", () => {
    const users = [
      { email: "c@example.com", externalId: "c", deleted: false },
      { email: "a@example.com", externalId: "a", deleted: false },
      { email: "b@example.com", externalId: "b", deleted: false },
    ];

    expect(sortUsers(users).map((u) => u.externalId)).toEqual(["a", "b", "c"]);
  });

  it("should sort by email when externalIds match", () => {
    const users = [
      { email: "b@example.com", externalId: "a", deleted: false },
      { email: "a@example.com", externalId: "a", deleted: false },
    ];

    expect(sortUsers(users).map((u) => u.email)).toEqual(["a@example.com", "b@example.com"]);
  });

  it("should sort deterministically when externalId is missing", () => {
    const users = [
      { email: "b@example.com", externalId: null as string, deleted: false },
      { email: "a@example.com", externalId: null as string, deleted: false },
    ];

    expect(sortUsers(users).map((u) => u.email)).toEqual(["a@example.com", "b@example.com"]);
  });
});
