using Bit.Core.Models;
using Bit.Core.Services;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
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

                FlattenUsersToGroups(groups, null, groups);

                if(!sendToServer)
                {
                    RestoreDeltas(startingGroupDelta, startingUserDelta);
                }

                if(!sendToServer || (groups.Count == 0 && users.Count == 0))
                {
                    return new SyncResult
                    {
                        Success = true,
                        Groups = groups,
                        Users = users
                    };
                }

                var request = new ImportRequest(groups, users);
                var json = JsonConvert.SerializeObject(request);
                var hash = ComputeHash(string.Concat(SettingsService.Instance.ApiBaseUrl, json));

                if(hash == SettingsService.Instance.LastSyncHash)
                {
                    return new SyncResult
                    {
                        Success = true,
                        Groups = groups,
                        Users = users
                    };
                }

                var response = await ApiService.Instance.PostImportAsync(request);
                if(response.Succeeded)
                {
                    SettingsService.Instance.LastSyncHash = hash;

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
            catch(Exception e)
            {
                RestoreDeltas(startingGroupDelta, startingUserDelta);
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
                case Enums.DirectoryType.GSuite:
                    return GSuiteDirectoryService.Instance;
                default:
                    return LdapDirectoryService.Instance;
            }
        }

        private static void FlattenUsersToGroups(List<GroupEntry> currentGroups, List<string> currentGroupsUsers,
            List<GroupEntry> allGroups)
        {
            foreach(var group in currentGroups)
            {
                var groupsInThisGroup = allGroups.Where(g => group.GroupMemberReferenceIds.Contains(g.ReferenceId)).ToList();
                var usersInThisGroup = group.UserMemberExternalIds.ToList();

                if(currentGroupsUsers != null)
                {
                    foreach(var id in currentGroupsUsers)
                    {
                        if(!group.UserMemberExternalIds.Contains(id))
                        {
                            group.UserMemberExternalIds.Add(id);
                        }
                    }

                    usersInThisGroup.AddRange(currentGroupsUsers);
                }

                // Recurse it
                FlattenUsersToGroups(groupsInThisGroup, usersInThisGroup, allGroups);
            }
        }

        private static void RestoreDeltas(string groupDelta, string userDelta)
        {
            if(SettingsService.Instance.Server.Type != Enums.DirectoryType.AzureActiveDirectory)
            {
                return;
            }

            SettingsService.Instance.GroupDeltaToken = groupDelta;
            SettingsService.Instance.UserDeltaToken = userDelta;
        }

        private static string ComputeHash(string value)
        {
            if(value == null)
            {
                return null;
            }

            string result = null;
            using(var hash = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(value);
                var hashBytes = hash.ComputeHash(bytes);
                result = Convert.ToBase64String(hashBytes);
            }

            return result;
        }
    }
}
