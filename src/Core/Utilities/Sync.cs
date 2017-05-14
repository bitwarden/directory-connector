using Bit.Core.Models;
using Bit.Core.Services;
using System;
using System.Collections;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public static class Sync
    {
        public static async Task<SyncResult> SyncAllAsync(bool force = false)
        {
            var now = DateTime.UtcNow;
            var gatherResult = await GatherAsync(force);
            if(!gatherResult.Success)
            {
                return gatherResult;
            }

            var request = new ImportRequest(gatherResult.Groups, gatherResult.Users);
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
                    Groups = gatherResult.Groups,
                    Users = gatherResult.Users
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

        public static async Task<SyncResult> GatherAsync(bool force = false)
        {
            if(!AuthService.Instance.Authenticated || !AuthService.Instance.OrganizationSet)
            {
                return new SyncResult
                {
                    Success = false,
                    ErrorMessage = "Not logged in or have an org set."
                };
            }

            if(SettingsService.Instance.Server == null)
            {
                return new SyncResult
                {
                    Success = false,
                    ErrorMessage = "No configuration for directory server."
                };
            }

            if(SettingsService.Instance.Sync == null)
            {
                return new SyncResult
                {
                    Success = false,
                    ErrorMessage = "No configuration for sync."
                };
            }

            List<GroupEntry> groups = null;
            if(SettingsService.Instance.Sync.SyncGroups)
            {
                groups = await GetGroupsAsync(force);
            }

            List<UserEntry> users = null;
            if(SettingsService.Instance.Sync.SyncUsers)
            {
                users = await GetUsersAsync(force);
            }

            FlattenGroupsToUsers(groups, null, groups, users);

            return new SyncResult
            {
                Success = true,
                Groups = groups,
                Users = users
            };
        }

        private static Task<List<GroupEntry>> GetGroupsAsync(bool force = false)
        {
            if(!SettingsService.Instance.Sync.SyncGroups)
            {
                throw new ApplicationException("Not configured to sync groups.");
            }

            if(SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(SettingsService.Instance.Sync == null)
            {
                throw new ApplicationException("No configuration for sync.");
            }

            if(!AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.GroupFilter) ? null :
                SettingsService.Instance.Sync.GroupFilter;

            if(!force && !string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.RevisionDateAttribute) &&
                SettingsService.Instance.LastGroupSyncDate.HasValue)
            {
                filter = string.Format("(&{0}({1}>{2}))",
                    filter != null ? string.Format("({0})", filter) : string.Empty,
                    SettingsService.Instance.Sync.RevisionDateAttribute,
                    SettingsService.Instance.LastGroupSyncDate.Value.ToGeneralizedTimeUTC());
            }

            var searcher = new DirectorySearcher(entry, filter);
            var result = searcher.FindAll();

            var groups = new List<GroupEntry>();
            foreach(SearchResult item in result)
            {
                var group = new GroupEntry
                {
                    DistinguishedName = new Uri(item.Path).Segments?.LastOrDefault()
                };

                if(group.DistinguishedName == null)
                {
                    continue;
                }

                // Name
                if(item.Properties.Contains(SettingsService.Instance.Sync.GroupNameAttribute) &&
                    item.Properties[SettingsService.Instance.Sync.GroupNameAttribute].Count > 0)
                {
                    group.Name = item.Properties[SettingsService.Instance.Sync.GroupNameAttribute][0].ToString();
                }
                else if(item.Properties.Contains("cn") && item.Properties["cn"].Count > 0)
                {
                    group.Name = item.Properties["cn"][0].ToString();
                }
                else
                {
                    continue;
                }

                // Dates
                group.CreationDate = ParseDate(item.Properties, SettingsService.Instance.Sync.CreationDateAttribute);
                group.RevisionDate = ParseDate(item.Properties, SettingsService.Instance.Sync.RevisionDateAttribute);

                // Members
                if(item.Properties.Contains(SettingsService.Instance.Sync.MemberAttribute) &&
                    item.Properties[SettingsService.Instance.Sync.MemberAttribute].Count > 0)
                {
                    foreach(var member in item.Properties[SettingsService.Instance.Sync.MemberAttribute])
                    {
                        var memberDn = member.ToString();
                        if(!group.Members.Contains(memberDn))
                        {
                            group.Members.Add(memberDn);
                        }
                    }
                }

                groups.Add(group);
            }

            return Task.FromResult(groups);
        }

        private static Task<List<UserEntry>> GetUsersAsync(bool force = false)
        {
            if(!SettingsService.Instance.Sync.SyncUsers)
            {
                throw new ApplicationException("Not configured to sync users.");
            }

            if(SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(SettingsService.Instance.Sync == null)
            {
                throw new ApplicationException("No configuration for sync.");
            }

            if(!AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.UserFilter) ? null :
                SettingsService.Instance.Sync.UserFilter;

            if(!force && !string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.RevisionDateAttribute) &&
                SettingsService.Instance.LastUserSyncDate.HasValue)
            {
                filter = string.Format("(&{0}({1}>{2}))",
                    filter != null ? string.Format("({0})", filter) : string.Empty,
                    SettingsService.Instance.Sync.RevisionDateAttribute,
                    SettingsService.Instance.LastUserSyncDate.Value.ToGeneralizedTimeUTC());
            }

            var searcher = new DirectorySearcher(entry, filter);
            var result = searcher.FindAll();

            var users = new List<UserEntry>();
            foreach(SearchResult item in result)
            {
                var user = new UserEntry
                {
                    DistinguishedName = new Uri(item.Path).Segments?.LastOrDefault()
                };

                if(user.DistinguishedName == null)
                {
                    continue;
                }

                // Email
                if(SettingsService.Instance.Sync.EmailPrefixSuffix &&
                    item.Properties.Contains(SettingsService.Instance.Sync.UserEmailPrefixAttribute) &&
                    item.Properties[SettingsService.Instance.Sync.UserEmailPrefixAttribute].Count > 0 &&
                    !string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.UserEmailSuffix))
                {
                    user.Email = string.Concat(
                        item.Properties[SettingsService.Instance.Sync.UserEmailPrefixAttribute][0].ToString(),
                        SettingsService.Instance.Sync.UserEmailSuffix).ToLowerInvariant();
                }
                else if(item.Properties.Contains(SettingsService.Instance.Sync.UserEmailAttribute) &&
                    item.Properties[SettingsService.Instance.Sync.UserEmailAttribute].Count > 0)
                {
                    user.Email = item.Properties[SettingsService.Instance.Sync.UserEmailAttribute][0]
                        .ToString()
                        .ToLowerInvariant();
                }
                else
                {
                    continue;
                }

                // Dates
                user.CreationDate = ParseDate(item.Properties, SettingsService.Instance.Sync.CreationDateAttribute);
                user.RevisionDate = ParseDate(item.Properties, SettingsService.Instance.Sync.RevisionDateAttribute);

                users.Add(user);
            }

            return Task.FromResult(users);
        }

        private static void FlattenGroupsToUsers(List<GroupEntry> currentGroups, List<UserEntry> currentGroupsUsers,
            List<GroupEntry> allGroups, List<UserEntry> allUsers)
        {
            foreach(var group in currentGroups)
            {
                var groupsInThisGroup = allGroups.Where(g => group.Members.Contains(g.DistinguishedName)).ToList();
                var usersInThisGroup = allUsers.Where(u => group.Members.Contains(u.DistinguishedName)).ToList();

                foreach(var user in usersInThisGroup)
                {
                    if(!user.Groups.Contains(group.DistinguishedName))
                    {
                        user.Groups.Add(group.DistinguishedName);
                    }
                }

                if(currentGroupsUsers != null)
                {
                    foreach(var user in currentGroupsUsers)
                    {
                        if(!user.Groups.Contains(group.DistinguishedName))
                        {
                            user.Groups.Add(group.DistinguishedName);
                        }
                    }

                    usersInThisGroup.AddRange(currentGroupsUsers);
                }

                // Recurse it
                FlattenGroupsToUsers(groupsInThisGroup, usersInThisGroup, allGroups, allUsers);
            }
        }

        private static DateTime? ParseDate(ResultPropertyCollection collection, string dateKey)
        {
            DateTime date;
            if(collection.Contains(dateKey) && collection[dateKey].Count > 0 &&
                DateTime.TryParse(collection[dateKey][0].ToString(), out date))
            {
                return date;
            }

            return null;
        }
    }
}
