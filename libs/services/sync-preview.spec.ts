import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import { OrganizationMember } from "@/libs/models/syncPreview";

import { computeSyncPreview } from "./sync-preview";

const Owner = 0;
const User = 2;

function request(
  users: { email: string; externalId: string; deleted?: boolean }[],
  groups: { name: string; externalId: string; memberExternalIds: string[] }[] = [],
  options: { overwriteExisting?: boolean; inviteUsersAfterProvisioning?: boolean } = {},
): OrganizationImportRequest {
  return new OrganizationImportRequest({
    users: users.map((u) => ({ deleted: false, ...u })),
    groups,
    overwriteExisting: options.overwriteExisting ?? false,
    largeImport: false,
    inviteUsersAfterProvisioning: options.inviteUsersAfterProvisioning ?? true,
  });
}

function member(
  id: string,
  email: string,
  externalId: string | null,
  type = User,
): OrganizationMember {
  return { id, email, externalId, type };
}

describe("computeSyncPreview", () => {
  it("should report no changes when the organization already matches the directory", () => {
    const preview = computeSyncPreview(
      [
        request(
          [{ email: "a@x.com", externalId: "a" }],
          [{ name: "G", externalId: "g", memberExternalIds: ["a"] }],
        ),
      ],
      [member("m1", "a@x.com", "a")],
      [{ id: "g1", name: "G", externalId: "g", memberIds: ["m1"] }],
    );

    expect(preview.usersToAdd).toEqual([]);
    expect(preview.usersToRemove).toEqual([]);
    expect(preview.usersToLink).toEqual([]);
    expect(preview.groupsToCreate).toEqual([]);
    expect(preview.groupsToUpdate).toEqual([]);
    expect(preview.unchangedUserCount).toBe(1);
    expect(preview.unchangedGroupCount).toBe(1);
  });

  it("should add directory users that are not yet in the organization", () => {
    const preview = computeSyncPreview(
      [request([{ email: "new@x.com", externalId: "new" }])],
      [],
      [],
    );

    expect(preview.usersToAdd).toEqual([{ email: "new@x.com", externalId: "new" }]);
    expect(preview.inviteNewUsers).toBe(true);
  });

  it("should report that new users are staged when invitations are turned off", () => {
    const preview = computeSyncPreview(
      [
        request([{ email: "new@x.com", externalId: "new" }], [], {
          inviteUsersAfterProvisioning: false,
        }),
      ],
      [],
      [],
    );

    expect(preview.inviteNewUsers).toBe(false);
  });

  it("should skip new users without an email address", () => {
    const preview = computeSyncPreview([request([{ email: "", externalId: "noemail" }])], [], []);

    expect(preview.usersToAdd).toEqual([]);
  });

  it("should link existing members without an external id by matching email", () => {
    const preview = computeSyncPreview(
      [request([{ email: "a@x.com", externalId: "a" }])],
      [member("m1", "a@x.com", null)],
      [],
    );

    expect(preview.usersToLink).toEqual([{ email: "a@x.com", externalId: "a" }]);
    expect(preview.usersToAdd).toEqual([]);
  });

  it("should remove external members the directory marks as deleted", () => {
    const preview = computeSyncPreview(
      [request([{ email: "gone@x.com", externalId: "gone", deleted: true }])],
      [member("m1", "gone@x.com", "gone")],
      [],
    );

    expect(preview.usersToRemove).toEqual([{ email: "gone@x.com", externalId: "gone" }]);
  });

  it("should not remove external members missing from the import unless overwriteExisting is on", () => {
    const members = [member("m1", "a@x.com", "a"), member("m2", "other@x.com", "other")];
    const users = [{ email: "a@x.com", externalId: "a" }];

    expect(computeSyncPreview([request(users)], members, []).usersToRemove).toEqual([]);
    expect(
      computeSyncPreview([request(users, [], { overwriteExisting: true })], members, [])
        .usersToRemove,
    ).toEqual([{ email: "other@x.com", externalId: "other" }]);
  });

  it("should never remove owners", () => {
    const preview = computeSyncPreview(
      [
        request([{ email: "o@x.com", externalId: "owner", deleted: true }], [], {
          overwriteExisting: true,
        }),
      ],
      [member("m1", "o@x.com", "owner", Owner), member("m2", "x@x.com", "x", Owner)],
      [],
    );

    expect(preview.usersToRemove).toEqual([]);
  });

  it("should not remove members who were added manually (no external id)", () => {
    const preview = computeSyncPreview(
      [request([], [], { overwriteExisting: true })],
      [member("m1", "manual@x.com", null)],
      [],
    );

    expect(preview.usersToRemove).toEqual([]);
  });

  it("should create groups that don't exist yet, including new members", () => {
    const preview = computeSyncPreview(
      [
        request(
          [{ email: "new@x.com", externalId: "new" }],
          [{ name: "Engineering", externalId: "eng", memberExternalIds: ["new"] }],
        ),
      ],
      [],
      [],
    );

    expect(preview.groupsToCreate).toEqual([
      { externalId: "eng", name: "Engineering", addedMembers: ["new@x.com"], removedMembers: [] },
    ]);
  });

  it("should report renamed groups and membership changes on existing groups", () => {
    const preview = computeSyncPreview(
      [
        request(
          [
            { email: "a@x.com", externalId: "a" },
            { email: "b@x.com", externalId: "b" },
          ],
          [{ name: "Engineering", externalId: "eng", memberExternalIds: ["b"] }],
        ),
      ],
      [member("m1", "a@x.com", "a"), member("m2", "b@x.com", "b")],
      [{ id: "g1", name: "Eng", externalId: "eng", memberIds: ["m1"] }],
    );

    expect(preview.groupsToUpdate).toEqual([
      {
        externalId: "eng",
        name: "Engineering",
        previousName: "Eng",
        addedMembers: ["b@x.com"],
        removedMembers: ["a@x.com"],
      },
    ]);
  });

  it("should ignore group members that don't resolve to an organization member", () => {
    const preview = computeSyncPreview(
      [request([], [{ name: "G", externalId: "g", memberExternalIds: ["unknown"] }])],
      [],
      [{ id: "g1", name: "G", externalId: "g", memberIds: [] }],
    );

    expect(preview.groupsToUpdate).toEqual([]);
    expect(preview.unchangedGroupCount).toBe(1);
  });

  it("should combine batched requests into one preview", () => {
    const preview = computeSyncPreview(
      [
        request([{ email: "a@x.com", externalId: "a" }]),
        request([{ email: "b@x.com", externalId: "b" }]),
      ],
      [],
      [],
    );

    expect(preview.usersToAdd.map((u) => u.externalId)).toEqual(["a", "b"]);
  });
});
