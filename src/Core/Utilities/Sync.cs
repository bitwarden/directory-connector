using Bit.Core.Models;
using System;
using System.Collections;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public static class Sync
    {
        public static Task<List<GroupEntry>> SyncGroupsAsync()
        {
            if(!Services.SettingsService.Instance.Server.SyncGroups)
            {
                throw new ApplicationException("Not configured to sync groups.");
            }

            if(Services.SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(!Services.AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = Services.SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(Services.SettingsService.Instance.Server.GroupFilter) ? null :
                Services.SettingsService.Instance.Server.GroupFilter;
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
                if(item.Properties.Contains(Services.SettingsService.Instance.Server.GroupNameAttribute) &&
                    item.Properties[Services.SettingsService.Instance.Server.GroupNameAttribute].Count > 0)
                {
                    group.Name = item.Properties[Services.SettingsService.Instance.Server.GroupNameAttribute][0].ToString();
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
                group.CreationDate = ParseDate(item.Properties, Services.SettingsService.Instance.Server.CreationDateAttribute);
                group.RevisionDate = ParseDate(item.Properties, Services.SettingsService.Instance.Server.RevisionDateAttribute);

                // Members
                if(item.Properties.Contains(Services.SettingsService.Instance.Server.MemberAttribute) &&
                    item.Properties[Services.SettingsService.Instance.Server.MemberAttribute].Count > 0)
                {
                    foreach(var member in item.Properties[Services.SettingsService.Instance.Server.MemberAttribute])
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

        public static Task<List<UserEntry>> SyncUsersAsync()
        {
            if(!Services.SettingsService.Instance.Server.SyncUsers)
            {
                throw new ApplicationException("Not configured to sync users.");
            }

            if(Services.SettingsService.Instance.Server == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(!Services.AuthService.Instance.Authenticated)
            {
                throw new ApplicationException("Not authenticated.");
            }

            var entry = Services.SettingsService.Instance.Server.GetDirectoryEntry();
            var filter = string.IsNullOrWhiteSpace(Services.SettingsService.Instance.Server.UserFilter) ? null :
                Services.SettingsService.Instance.Server.UserFilter;
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
                if(Services.SettingsService.Instance.Server.EmailPrefixSuffix &&
                    item.Properties.Contains(Services.SettingsService.Instance.Server.UserEmailPrefixAttribute) &&
                    item.Properties[Services.SettingsService.Instance.Server.UserEmailPrefixAttribute].Count > 0 &&
                    !string.IsNullOrWhiteSpace(Services.SettingsService.Instance.Server.UserEmailSuffix))
                {
                    user.Email = string.Concat(
                        item.Properties[Services.SettingsService.Instance.Server.UserEmailPrefixAttribute][0].ToString(),
                        Services.SettingsService.Instance.Server.UserEmailSuffix).ToLowerInvariant();
                }
                else if(item.Properties.Contains(Services.SettingsService.Instance.Server.UserEmailAttribute) &&
                    item.Properties[Services.SettingsService.Instance.Server.UserEmailAttribute].Count > 0)
                {
                    user.Email = item.Properties[Services.SettingsService.Instance.Server.UserEmailAttribute][0]
                        .ToString()
                        .ToLowerInvariant();
                }
                else
                {
                    continue;
                }

                // Dates
                user.CreationDate = ParseDate(item.Properties, Services.SettingsService.Instance.Server.CreationDateAttribute);
                user.RevisionDate = ParseDate(item.Properties, Services.SettingsService.Instance.Server.RevisionDateAttribute);

                users.Add(user);
            }

            return Task.FromResult(users);
        }

        public static async Task SyncAllAsync()
        {
            List<GroupEntry> groups = null;
            if(Services.SettingsService.Instance.Server.SyncGroups)
            {
                groups = await SyncGroupsAsync();
            }

            List<UserEntry> users = null;
            if(Services.SettingsService.Instance.Server.SyncUsers)
            {
                users = await SyncUsersAsync();
            }

            AssociateGroups(groups, users);
        }

        private static void AssociateGroups(List<GroupEntry> groups, List<UserEntry> users)
        {
            if(groups == null || !groups.Any())
            {
                return;
            }

            foreach(var group in groups)
            {
                if(group.Members.Any())
                {
                    group.GroupMembers = groups.Where(g => group.Members.Contains(g.DistinguishedName)).ToList();

                    if(users != null)
                    {
                        var usersInThisGroup = users.Where(u => group.Members.Contains(u.DistinguishedName)).ToList();
                        foreach(var user in usersInThisGroup)
                        {
                            user.Groups.Add(group);
                        }
                    }

                    AssociateGroups(group.GroupMembers, users);
                }
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
