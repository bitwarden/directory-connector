using Bit.Core.Enums;
using Bit.Core.Models;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace Bit.Core.Services
{
    public class LdapDirectoryService : IDirectoryService
    {
        private static LdapDirectoryService _instance;

        private LdapDirectoryService() { }

        public static IDirectoryService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new LdapDirectoryService();
                }

                return _instance;
            }
        }

        public async Task<Tuple<List<GroupEntry>, List<UserEntry>>> GetEntriesAsync(bool force = false)
        {
            if(!AuthService.Instance.Authenticated || !AuthService.Instance.OrganizationSet)
            {
                throw new ApplicationException("Not logged in or have an org set.");
            }

            if(SettingsService.Instance.Server?.Ldap == null)
            {
                throw new ApplicationException("No configuration for directory server.");
            }

            if(SettingsService.Instance.Sync == null)
            {
                throw new ApplicationException("No configuration for sync.");
            }

            List<UserEntry> users = null;
            if(SettingsService.Instance.Sync.SyncUsers)
            {
                users = await GetUsersAsync(force);
            }

            List<GroupEntry> groups = null;
            if(SettingsService.Instance.Sync.SyncGroups)
            {
                groups = await GetGroupsAsync(force || users.Any());
            }

            return new Tuple<List<GroupEntry>, List<UserEntry>>(groups, users);
        }

        private static Task<List<GroupEntry>> GetGroupsAsync(bool force = false)
        {
            if(!SettingsService.Instance.Sync.SyncGroups)
            {
                throw new ApplicationException("Not configured to sync groups.");
            }

            if(SettingsService.Instance.Server?.Ldap == null)
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

            var entry = SettingsService.Instance.Server.Ldap.GetGroupDirectoryEntry();

            var originalFilter = BuildBaseFilter(SettingsService.Instance.Sync.Ldap.GroupObjectClass,
                SettingsService.Instance.Sync.GroupFilter);

            var filter = originalFilter;
            var revisionFilter = BuildRevisionFilter(filter, force, SettingsService.Instance.LastGroupSyncDate);
            var searchSinceRevision = filter != revisionFilter;
            filter = revisionFilter;

            var searcher = new DirectorySearcher(entry, filter);
            var result = searcher.FindAll();

            var initialSearchGroupIds = new List<string>();
            foreach(SearchResult item in result)
            {
                initialSearchGroupIds.Add(DNFromPath(item.Path));
            }

            if(searchSinceRevision && !initialSearchGroupIds.Any())
            {
                return Task.FromResult(new List<GroupEntry>());
            }
            else if(searchSinceRevision)
            {
                searcher = new DirectorySearcher(entry, originalFilter);
                result = searcher.FindAll();
            }

            var userFilter = BuildBaseFilter(SettingsService.Instance.Sync.Ldap.UserObjectClass,
                SettingsService.Instance.Sync.UserFilter);
            var userSearcher = new DirectorySearcher(entry, userFilter);
            var userResult = userSearcher.FindAll();

            var userIdsDict = MakeIdIndex(userResult);

            var groups = new List<GroupEntry>();
            foreach(SearchResult item in result)
            {
                var group = BuildGroup(item, userIdsDict);
                if(group == null)
                {
                    continue;
                }

                groups.Add(group);
            }

            return Task.FromResult(groups);
        }

        private static Dictionary<string, string> MakeIdIndex(SearchResultCollection result)
        {
            var dict = new Dictionary<string, string>();
            foreach(SearchResult item in result)
            {
                var referenceId = DNFromPath(item.Path);
                var externalId = referenceId;

                if(item.Properties.Contains("objectGUID") && item.Properties["objectGUID"].Count > 0)
                {
                    externalId = item.Properties["objectGUID"][0].FromGuidToString();
                }

                dict.Add(referenceId, externalId);
            }
            return dict;
        }

        private static GroupEntry BuildGroup(SearchResult item, Dictionary<string, string> userIndex)
        {
            var group = new GroupEntry
            {
                ReferenceId = DNFromPath(item.Path)
            };

            if(group.ReferenceId == null)
            {
                return null;
            }

            // External Id
            if(item.Properties.Contains("objectGUID") && item.Properties["objectGUID"].Count > 0)
            {
                group.ExternalId = item.Properties["objectGUID"][0].FromGuidToString();
            }
            else
            {
                group.ExternalId = group.ReferenceId;
            }

            // Name
            if(item.Properties.Contains(SettingsService.Instance.Sync.Ldap.GroupNameAttribute) &&
                item.Properties[SettingsService.Instance.Sync.Ldap.GroupNameAttribute].Count > 0)
            {
                group.Name = item.Properties[SettingsService.Instance.Sync.Ldap.GroupNameAttribute][0].ToString();
            }
            else if(item.Properties.Contains("cn") && item.Properties["cn"].Count > 0)
            {
                group.Name = item.Properties["cn"][0].ToString();
            }
            else
            {
                return null;
            }

            // Dates
            group.CreationDate = item.Properties.ParseDateTime(SettingsService.Instance.Sync.Ldap.CreationDateAttribute);
            group.RevisionDate = item.Properties.ParseDateTime(SettingsService.Instance.Sync.Ldap.RevisionDateAttribute);

            // Members
            if(item.Properties.Contains(SettingsService.Instance.Sync.Ldap.MemberAttribute) &&
                item.Properties[SettingsService.Instance.Sync.Ldap.MemberAttribute].Count > 0)
            {
                foreach(var member in item.Properties[SettingsService.Instance.Sync.Ldap.MemberAttribute])
                {
                    var memberDn = member.ToString();
                    if(userIndex.ContainsKey(memberDn) && !group.UserMemberExternalIds.Contains(userIndex[memberDn]))
                    {
                        group.UserMemberExternalIds.Add(userIndex[memberDn]);
                    }
                    else if(!group.GroupMemberReferenceIds.Contains(memberDn))
                    {
                        group.GroupMemberReferenceIds.Add(memberDn);
                    }
                }
            }

            return group;
        }

        private static Task<List<UserEntry>> GetUsersAsync(bool force = false)
        {
            if(!SettingsService.Instance.Sync.SyncUsers)
            {
                throw new ApplicationException("Not configured to sync users.");
            }

            if(SettingsService.Instance.Server?.Ldap == null)
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

            var entry = SettingsService.Instance.Server.Ldap.GetUserDirectoryEntry();
            var filter = BuildBaseFilter(SettingsService.Instance.Sync.Ldap.UserObjectClass,
                SettingsService.Instance.Sync.UserFilter);
            filter = BuildRevisionFilter(filter, force, SettingsService.Instance.LastUserSyncDate);

            var searcher = new DirectorySearcher(entry, filter);
            var result = searcher.FindAll();

            var users = new List<UserEntry>();
            foreach(SearchResult item in result)
            {
                var user = BuildUser(item, false);
                if(user == null)
                {
                    continue;
                }

                users.Add(user);
            }

            // Deleted users
            if(SettingsService.Instance.Server.Type == DirectoryType.ActiveDirectory)
            {
                var deletedEntry = SettingsService.Instance.Server.Ldap.GetBasePathDirectoryEntry();
                var deletedFilter = BuildBaseFilter(SettingsService.Instance.Sync.Ldap.UserObjectClass, "(isDeleted=TRUE)");
                deletedFilter = BuildRevisionFilter(deletedFilter, force, SettingsService.Instance.LastUserSyncDate);

                var deletedSearcher = new DirectorySearcher(deletedEntry, deletedFilter);
                deletedSearcher.Tombstone = true;
                var deletedResult = deletedSearcher.FindAll();
                foreach(SearchResult item in deletedResult)
                {
                    var user = BuildUser(item, true);
                    if(user == null)
                    {
                        continue;
                    }

                    users.Add(user);
                }
            }

            return Task.FromResult(users);
        }

        private static string BuildBaseFilter(string objectClass, string subFilter)
        {
            var filter = BuildObjectClassFilter(objectClass);
            if(!string.IsNullOrWhiteSpace(subFilter))
            {
                filter = string.Format("(&{0}{1})", filter, subFilter);
            }

            return filter;
        }

        private static string BuildObjectClassFilter(string objectClass)
        {
            return string.Format("(&(objectClass={0}))", objectClass);
        }

        private static string BuildRevisionFilter(string baseFilter, bool force, DateTime? lastRevisionDate)
        {
            if(!force && lastRevisionDate.HasValue &&
                !string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.Ldap.RevisionDateAttribute))
            {
                baseFilter = string.Format("(&{0}({1}>={2}))",
                    baseFilter,
                    SettingsService.Instance.Sync.Ldap.RevisionDateAttribute,
                    lastRevisionDate.Value.ToGeneralizedTimeUTC());
            }

            return baseFilter;
        }

        private static UserEntry BuildUser(SearchResult item, bool deleted)
        {
            var user = new UserEntry
            {
                ReferenceId = DNFromPath(item.Path),
                Deleted = deleted
            };

            if(user.ReferenceId == null)
            {
                return null;
            }

            // External Id
            if(item.Properties.Contains("objectGUID") && item.Properties["objectGUID"].Count > 0)
            {
                user.ExternalId = item.Properties["objectGUID"][0].FromGuidToString();
            }
            else
            {
                user.ExternalId = user.ReferenceId;
            }

            user.Disabled = EntryDisabled(item);

            // Email
            if(SettingsService.Instance.Sync.Ldap.EmailPrefixSuffix &&
                item.Properties.Contains(SettingsService.Instance.Sync.Ldap.UserEmailPrefixAttribute) &&
                item.Properties[SettingsService.Instance.Sync.Ldap.UserEmailPrefixAttribute].Count > 0 &&
                !string.IsNullOrWhiteSpace(SettingsService.Instance.Sync.Ldap.UserEmailSuffix))
            {
                user.Email = string.Concat(
                    item.Properties[SettingsService.Instance.Sync.Ldap.UserEmailPrefixAttribute][0].ToString(),
                    SettingsService.Instance.Sync.Ldap.UserEmailSuffix).ToLowerInvariant();
            }
            else if(item.Properties.Contains(SettingsService.Instance.Sync.Ldap.UserEmailAttribute) &&
                item.Properties[SettingsService.Instance.Sync.Ldap.UserEmailAttribute].Count > 0)
            {
                user.Email = item.Properties[SettingsService.Instance.Sync.Ldap.UserEmailAttribute][0]
                    .ToString()
                    .ToLowerInvariant();
            }
            else if(!user.Disabled && !user.Deleted)
            {
                return null;
            }

            // Dates
            user.CreationDate = item.Properties.ParseDateTime(SettingsService.Instance.Sync.Ldap.CreationDateAttribute);
            user.RevisionDate = item.Properties.ParseDateTime(SettingsService.Instance.Sync.Ldap.RevisionDateAttribute);

            return user;
        }

        private static bool EntryDisabled(SearchResult item)
        {
            if(!item.Properties.Contains("userAccountControl") || item.Properties["userAccountControl"].Count == 0)
            {
                return false;
            }

            UserAccountControl control;
            if(!Enum.TryParse(item.Properties["userAccountControl"][0].ToString(), out control))
            {
                return false;
            }

            return (control & UserAccountControl.AccountDisabled) == UserAccountControl.AccountDisabled;
        }

        private static string DNFromPath(string path)
        {
            var dn = new Uri(path).Segments?.LastOrDefault();
            if(dn == null)
            {
                return null;
            }

            return WebUtility.UrlDecode(dn);
        }
    }
}
