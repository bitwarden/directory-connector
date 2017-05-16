using Bit.Core.Models;
using Bit.Core.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public static class Sync
    {
        public static async Task<SyncResult> SyncAllAsync(bool force = false, bool sendToServer = true)
        {
            var startingGroupDelta = SettingsService.Instance.GroupDeltaToken;
            var startingUserDelta = SettingsService.Instance.UserDeltaToken;

            try
            {
                var now = DateTime.UtcNow;
                var entriesResult = await GetDirectoryService().GetEntriesAsync(force);
                var groups = entriesResult.Item1;
                var users = entriesResult.Item2;

                FlattenUsersToGroups(groups, null, groups, users);

                if(!sendToServer || (groups.Count == 0 && users.Count == 0))
                {
                    RestoreDeltas(startingGroupDelta, startingUserDelta);
                    return new SyncResult
                    {
                        Success = true,
                        Groups = groups,
                        Users = users
                    };
                }

                var request = new ImportRequest(groups, users);
                var response = await ApiService.Instance.PostImportAsync(request);
                if(response.Succeeded)
                {
                    if(SettingsService.Instance.Sync.SyncGroups)
                    {
                        SettingsService.Instance.LastGroupSyncDate = now;
                    }

                    if(SettingsService.Instance.Sync.SyncUsers)
                    {
                        SettingsService.Instance.LastUserSyncDate = now;
                    }

                    return new SyncResult
                    {
                        Success = true,
                        Groups = groups,
                        Users = users
                    };
                }
                else
                {
                    RestoreDeltas(startingGroupDelta, startingUserDelta);
                    return new SyncResult
                    {
                        Success = false,
                        ErrorMessage = response.Errors.FirstOrDefault()?.Message
                    };
                }
            }
            catch(ApplicationException e)
            {
                RestoreDeltas(startingGroupDelta, startingUserDelta);
                return new SyncResult
                {
                    Success = false,
                    ErrorMessage = e.Message
                };
            }
            catch
            {
                RestoreDeltas(startingGroupDelta, startingUserDelta);
                throw;
            }
        }

        private static IDirectoryService GetDirectoryService()
        {
            switch(SettingsService.Instance.Server.Type)
            {
                case Enums.DirectoryType.AzureActiveDirectory:
                    return AzureDirectoryService.Instance;
                default:
                    return LdapDirectoryService.Instance;
            }
        }

        private static void FlattenUsersToGroups(List<GroupEntry> currentGroups, List<UserEntry> currentGroupsUsers,
            List<GroupEntry> allGroups, List<UserEntry> allUsers)
        {
            foreach(var group in currentGroups)
            {
                var groupsInThisGroup = allGroups.Where(g => group.Members.Contains(g.ReferenceId)).ToList();
                var usersInThisGroup = allUsers.Where(u => group.Members.Contains(u.ReferenceId)).ToList();

                foreach(var user in usersInThisGroup)
                {
                    if(!group.Users.Contains(user.ExternalId))
                    {
                        group.Users.Add(user.ExternalId);
                    }
                }

                if(currentGroupsUsers != null)
                {
                    foreach(var user in currentGroupsUsers)
                    {
                        if(!group.Users.Contains(user.ExternalId))
                        {
                            group.Users.Add(user.ExternalId);
                        }
                    }

                    usersInThisGroup.AddRange(currentGroupsUsers);
                }

                // Recurse it
                FlattenUsersToGroups(groupsInThisGroup, usersInThisGroup, allGroups, allUsers);
            }
        }

        private static void RestoreDeltas(string groupDelta, string userDelta)
        {
            SettingsService.Instance.GroupDeltaToken = groupDelta;
            SettingsService.Instance.UserDeltaToken = userDelta;
        }
    }
}
