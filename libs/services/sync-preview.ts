import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import {
  OrganizationGroup,
  OrganizationMember,
  OrganizationUserTypeOwner,
  SyncPreview,
  SyncPreviewGroup,
  SyncPreviewUser,
} from "@/libs/models/syncPreview";

/**
 * Works out what importing `requests` would change in an organization that currently has
 * `members` and `groups`, without changing anything.
 *
 * This mirrors the server's ImportOrganizationUsersAndGroupsCommand: deleted directory users are
 * removed, `overwriteExisting` removes external members missing from the import, existing members
 * without an external id are linked by email, new external ids are added, and group membership is
 * replaced with the imported members that resolve to an organization member. Owners are never
 * removed. Batched imports are treated as one combined import.
 *
 * @param groups Existing groups. Groups that appear in the import need `memberIds` loaded.
 */
export function computeSyncPreview(
  requests: OrganizationImportRequest[],
  members: OrganizationMember[],
  groups: OrganizationGroup[],
): SyncPreview {
  const importedMembers = requests.flatMap((r) => r.members);
  const importedUsers = importedMembers.filter((m) => !m.deleted);
  const removeExternalIds = new Set(
    importedMembers.filter((m) => m.deleted).map((m) => m.externalId),
  );
  const importedGroups = requests.flatMap((r) => r.groups);
  const overwriteExisting = requests.some((r) => r.overwriteExisting);
  const inviteNewUsers = requests[0]?.inviteUsersAfterProvisioning ?? false;

  const importedExternalIds = new Set(importedUsers.map((u) => u.externalId));
  const importedByExternalId = new Map(importedUsers.map((u) => [u.externalId, u]));
  const membersById = new Map(members.map((m) => [m.id, m]));
  const existingExternal = members.filter((m) => !isBlank(m.externalId));

  // External id -> organization member id, as the server tracks it while importing.
  const memberIdByExternalId = new Map(existingExternal.map((m) => [m.externalId, m.id]));

  // 1. Deleted directory users (and, with overwriteExisting, external members not in the import).
  const removed = new Map<string, OrganizationMember>();
  for (const member of existingExternal) {
    if (member.type === OrganizationUserTypeOwner || importedExternalIds.has(member.externalId)) {
      continue;
    }
    if (removeExternalIds.has(member.externalId) || overwriteExisting) {
      removed.set(member.id, member);
    }
  }
  if (overwriteExisting) {
    removed.forEach((m) => memberIdByExternalId.delete(m.externalId));
  }

  // 2. Existing members without an external id are linked to directory users with the same email.
  const importedByEmail = new Map(importedUsers.map((u) => [u.email, u]));
  const usersToLink: SyncPreviewUser[] = [];
  for (const member of members) {
    if (!isBlank(member.externalId) || member.email == null) {
      continue;
    }
    const imported = importedByEmail.get(member.email);
    if (imported != null) {
      usersToLink.push({ email: member.email, externalId: imported.externalId });
      memberIdByExternalId.set(imported.externalId, member.id);
    }
  }

  // 3. Directory users not yet in the organization are added.
  const usersToAdd: SyncPreviewUser[] = [];
  for (const externalId of importedExternalIds) {
    const imported = importedByExternalId.get(externalId);
    if (memberIdByExternalId.has(externalId) || isBlank(imported.email)) {
      continue;
    }
    usersToAdd.push({ email: imported.email, externalId });
    memberIdByExternalId.set(externalId, newMemberId(externalId));
  }

  // 4. Groups are created, renamed, and have their membership replaced.
  const describeMember = (memberId: string) => {
    if (memberId.startsWith(NewMemberPrefix)) {
      const externalId = memberId.slice(NewMemberPrefix.length);
      return importedByExternalId.get(externalId)?.email ?? externalId;
    }
    const member = membersById.get(memberId);
    return member?.email ?? member?.externalId ?? memberId;
  };

  const existingGroupsByExternalId = new Map(
    groups.filter((g) => !isBlank(g.externalId)).map((g) => [g.externalId, g]),
  );
  const groupsToCreate: SyncPreviewGroup[] = [];
  const groupsToUpdate: SyncPreviewGroup[] = [];
  let unchangedGroupCount = 0;

  for (const imported of importedGroups) {
    const newMemberIds = new Set(
      imported.memberExternalIds
        .filter((id) => memberIdByExternalId.has(id))
        .map((id) => memberIdByExternalId.get(id)),
    );
    const existing = existingGroupsByExternalId.get(imported.externalId);

    if (existing == null) {
      groupsToCreate.push({
        externalId: imported.externalId,
        name: imported.name,
        addedMembers: [...newMemberIds].map(describeMember),
        removedMembers: [],
      });
      continue;
    }

    const oldMemberIds = new Set(existing.memberIds ?? []);
    const added = [...newMemberIds].filter((id) => !oldMemberIds.has(id));
    const removedMembers = [...oldMemberIds].filter((id) => !newMemberIds.has(id));
    const renamed = existing.name !== imported.name;

    if (!renamed && added.length === 0 && removedMembers.length === 0) {
      unchangedGroupCount++;
      continue;
    }
    groupsToUpdate.push({
      externalId: imported.externalId,
      name: imported.name,
      previousName: renamed ? existing.name : undefined,
      addedMembers: added.map(describeMember),
      removedMembers: removedMembers.map(describeMember),
    });
  }

  const linkedExternalIds = new Set(usersToLink.map((u) => u.externalId));
  const addedExternalIds = new Set(usersToAdd.map((u) => u.externalId));

  return {
    inviteNewUsers,
    usersToAdd,
    usersToLink,
    usersToRemove: [...removed.values()].map((m) => ({
      email: m.email ?? m.externalId,
      externalId: m.externalId,
    })),
    groupsToCreate,
    groupsToUpdate,
    unchangedUserCount: [...importedExternalIds].filter(
      (id) => !linkedExternalIds.has(id) && !addedExternalIds.has(id) && !isBlankEmail(id),
    ).length,
    unchangedGroupCount,
  };

  function isBlankEmail(externalId: string) {
    return isBlank(importedByExternalId.get(externalId)?.email);
  }
}

const NewMemberPrefix = "new:";

function newMemberId(externalId: string) {
  return NewMemberPrefix + externalId;
}

function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === "";
}
