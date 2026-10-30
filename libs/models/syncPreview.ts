/** A Bitwarden organization member, as returned by the public API (`GET /public/members`). */
export interface OrganizationMember {
  id: string;
  email: string | null;
  externalId: string | null;
  /** OrganizationUserType: 0 = Owner, 1 = Admin, 2 = User, 4 = Custom. */
  type: number;
}

/** A Bitwarden organization group, as returned by the public API (`GET /public/groups`). */
export interface OrganizationGroup {
  id: string;
  name: string;
  externalId: string | null;
  /** Organization member ids in the group. Only loaded for groups the sync would touch. */
  memberIds?: string[];
}

export const OrganizationUserTypeOwner = 0;

export interface SyncPreviewUser {
  email: string;
  externalId: string;
}

export interface SyncPreviewGroup {
  externalId: string;
  name: string;
  /** Set when an existing group would be renamed. */
  previousName?: string;
  /** Emails (or external ids when there's no email) of members who would be added or removed. */
  addedMembers: string[];
  removedMembers: string[];
}

/** What the next sync would change in the Bitwarden organization. */
export interface SyncPreview {
  /** False when new users would be added in the Staged status instead of being invited. */
  inviteNewUsers: boolean;
  usersToAdd: SyncPreviewUser[];
  /** Existing members without an external id that would be linked to a directory user by email. */
  usersToLink: SyncPreviewUser[];
  usersToRemove: SyncPreviewUser[];
  groupsToCreate: SyncPreviewGroup[];
  groupsToUpdate: SyncPreviewGroup[];
  unchangedUserCount: number;
  unchangedGroupCount: number;
}
