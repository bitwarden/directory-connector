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
        public static async Task SyncAllAsync()
        {
            List<GroupEntry> groups = null;
            if(SettingsService.Instance.Server.SyncGroups)
            {
                groups = await GetGroupsAsync();
            }

            List<UserEntry> users = null;
            if(SettingsService.Instance.Server.SyncUsers)
            {
                users = await GetUsersAsync();
            }

            FlattenGroupsToUsers(groups, null, groups, users);

            var request = new ImportRequest(groups, users);
            await ApiService.Instance.PostImportAsync(request);
        }

        private static Task<List<GroupEntry>> GetGroupsAsync()
        {
            if(!SettingsService.Instance.Server.SyncGroups)
            {
                throw new ApplicationException("Not configured to sync groups.");
            }

            if(SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(!AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(SettingsService.Instance.Server.GroupFilter) ? null :
                SettingsService.Instance.Server.GroupFilter;
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
                if(item.Properties.Contains(SettingsService.Instance.Server.GroupNameAttribute) &&
                    item.Properties[SettingsService.Instance.Server.GroupNameAttribute].Count > 0)
                {
                    group.Name = item.Properties[SettingsService.Instance.Server.GroupNameAttribute][0].ToString();
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
                group.CreationDate = ParseDate(item.Properties, SettingsService.Instance.Server.CreationDateAttribute);
                group.RevisionDate = ParseDate(item.Properties, SettingsService.Instance.Server.RevisionDateAttribute);

                // Members
                if(item.Properties.Contains(SettingsService.Instance.Server.MemberAttribute) &&
                    item.Properties[SettingsService.Instance.Server.MemberAttribute].Count > 0)
                {
                    foreach(var member in item.Properties[SettingsService.Instance.Server.MemberAttribute])
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

        private static Task<List<UserEntry>> GetUsersAsync()
        {
            if(!SettingsService.Instance.Server.SyncUsers)
            {
                throw new ApplicationException("Not configured to sync users.");
            }

            if(SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(!AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(SettingsService.Instance.Server.UserFilter) ? null :
                SettingsService.Instance.Server.UserFilter;
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
                if(SettingsService.Instance.Server.EmailPrefixSuffix &&
                    item.Properties.Contains(SettingsService.Instance.Server.UserEmailPrefixAttribute) &&
                    item.Properties[SettingsService.Instance.Server.UserEmailPrefixAttribute].Count > 0 &&
                    !string.IsNullOrWhiteSpace(SettingsService.Instance.Server.UserEmailSuffix))
                {
                    user.Email = string.Concat(
                        item.Properties[SettingsService.Instance.Server.UserEmailPrefixAttribute][0].ToString(),
                        SettingsService.Instance.Server.UserEmailSuffix).ToLowerInvariant();
                }
                else if(item.Properties.Contains(SettingsService.Instance.Server.UserEmailAttribute) &&
                    item.Properties[SettingsService.Instance.Server.UserEmailAttribute].Count > 0)
                {
                    user.Email = item.Properties[SettingsService.Instance.Server.UserEmailAttribute][0]
                        .ToString()
                        .ToLowerInvariant();
                }
                else
                {
                    continue;
                }

                // Dates
                user.CreationDate = ParseDate(item.Properties, SettingsService.Instance.Server.CreationDateAttribute);
                user.RevisionDate = ParseDate(item.Properties, SettingsService.Instance.Server.RevisionDateAttribute);

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
