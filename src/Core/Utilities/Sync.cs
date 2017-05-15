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
            try
            {
                var now = DateTime.UtcNow;
                var entriesResult = await GetDirectoryService().GetEntriesAsync(force);
                var groups = entriesResult.Item1;
                var users = entriesResult.Item2;

                FlattenGroupsToUsers(groups, null, groups, users);

                if(!sendToServer)
                {
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
                    return new SyncResult
                    {
                        Success = false,
                        ErrorMessage = response.Errors.FirstOrDefault()?.Message
                    };
                }
            }
            catch (ApplicationException e)
            {
                return new SyncResult
                {
                    Success = false,
                    ErrorMessage = e.Message
                };
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

        private static void FlattenGroupsToUsers(List<GroupEntry> currentGroups, List<UserEntry> currentGroupsUsers,
            List<GroupEntry> allGroups, List<UserEntry> allUsers)
        {
            foreach(var group in currentGroups)
            {
                var groupsInThisGroup = allGroups.Where(g => group.Members.Contains(g.Id)).ToList();
                var usersInThisGroup = allUsers.Where(u => group.Members.Contains(u.Id)).ToList();

                foreach(var user in usersInThisGroup)
                {
                    if(!user.Groups.Contains(group.Id))
                    {
                        user.Groups.Add(group.Id);
                    }
                }

                if(currentGroupsUsers != null)
                {
                    foreach(var user in currentGroupsUsers)
                    {
                        if(!user.Groups.Contains(group.Id))
                        {
                            user.Groups.Add(group.Id);
                        }
                    }

                    usersInThisGroup.AddRange(currentGroupsUsers);
                }

                // Recurse it
                FlattenGroupsToUsers(groupsInThisGroup, usersInThisGroup, allGroups, allUsers);
            }
        }
    }
}
