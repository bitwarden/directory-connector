using Bit.Core.Models;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Graph;
using System.Linq;
using Bit.Core.Utilities;

namespace Bit.Core.Services
{
    public class AzureDirectoryService : IDirectoryService
    {
        private static AzureDirectoryService _instance;
        private static GraphServiceClient _graphClient;

        private AzureDirectoryService()
        {
            _graphClient = new GraphServiceClient(new AzureAuthenticationProvider());
        }

        public static IDirectoryService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new AzureDirectoryService();
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

            if(SettingsService.Instance.Server?.Azure == null)
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
                var filter = CreateSetFromFilter(SettingsService.Instance.Sync.GroupFilter);
                groups = await GetGroupsAsync(force || (users?.Any(u => !u.Deleted && !u.Disabled) ?? false), filter);

                if(filter != null && users != null)
                {
                    users = users.Where(u => u.Disabled || u.Deleted || 
                        groups.Any(g => g.UserMemberExternalIds.Contains(u.ExternalId))).ToList();
                }
            }

            return new Tuple<List<GroupEntry>, List<UserEntry>>(groups, users);
        }

        private async static Task<List<GroupEntry>> GetGroupsAsync(bool force, Tuple<bool, HashSet<string>> filter)
        {
            if(!SettingsService.Instance.Sync.SyncGroups)
            {
                throw new ApplicationException("Not configured to sync groups.");
            }

            if(SettingsService.Instance.Server?.Azure == null)
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

            var entries = new List<GroupEntry>();
            var changedGroupIds = new List<string>();
            var getFullResults = SettingsService.Instance.GroupDeltaToken == null || force;

            try
            {
                var delataRequest = _graphClient.Groups.Delta().Request();
                if(!getFullResults)
                {
                    delataRequest.QueryOptions.Add(new QueryOption("$deltatoken", SettingsService.Instance.GroupDeltaToken));
                }

                var groupsDelta = await delataRequest.GetAsync();
                while(true)
                {
                    if(getFullResults)
                    {
                        foreach(var group in groupsDelta)
                        {
                            if(FilterOutResult(filter, group.DisplayName))
                            {
                                continue;
                            }

                            var entry = await BuildGroupAsync(group);
                            entries.Add(entry);
                        }
                    }
                    else
                    {
                        changedGroupIds.AddRange(groupsDelta.Select(g => g.Id));
                    }

                    if(groupsDelta.NextPageRequest == null)
                    {
                        object deltaLink;
                        if(groupsDelta.AdditionalData.TryGetValue("@odata.deltaLink", out deltaLink))
                        {
                            var deltaUriQuery = new Uri(deltaLink.ToString()).ParseQueryString();
                            if(deltaUriQuery["$deltatoken"] != null)
                            {
                                SettingsService.Instance.GroupDeltaToken = deltaUriQuery["$deltatoken"];
                            }
                        }
                        break;
                    }
                    else
                    {
                        groupsDelta = await groupsDelta.NextPageRequest.GetAsync();
                    }
                }
            }
            catch { }

            if(getFullResults || !changedGroupIds.Any())
            {
                return entries;
            }

            var groups = await _graphClient.Groups.Request().GetAsync();
            while(true)
            {
                foreach(var group in groups)
                {
                    if(FilterOutResult(filter, group.DisplayName))
                    {
                        continue;
                    }

                    var entry = await BuildGroupAsync(group);
                    entries.Add(entry);
                }

                if(groups.NextPageRequest == null)
                {
                    break;
                }
                else
                {
                    groups = await groups.NextPageRequest.GetAsync();
                }
            }

            return entries;
        }

        private async static Task<GroupEntry> BuildGroupAsync(Group group)
        {
            var entry = new GroupEntry
            {
                ReferenceId = group.Id,
                ExternalId = group.Id,
                Name = group.DisplayName
            };

            var members = await _graphClient.Groups[group.Id].Members.Request().Select("id").GetAsync();
            foreach(var member in members)
            {
                if(member is User)
                {
                    entry.UserMemberExternalIds.Add(member.Id);
                }
                else if(member is Group)
                {
                    entry.GroupMemberReferenceIds.Add(member.Id);
                }
            }

            return entry;
        }

        private async static Task<List<UserEntry>> GetUsersAsync(bool force)
        {
            if(!SettingsService.Instance.Sync.SyncUsers)
            {
                throw new ApplicationException("Not configured to sync users.");
            }

            if(SettingsService.Instance.Server?.Azure == null)
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

            var entries = new List<UserEntry>();
            var filter = CreateSetFromFilter(SettingsService.Instance.Sync.UserFilter);

            var userRequest = _graphClient.Users.Delta();
            IUserDeltaCollectionPage users = null;

            if(!force && SettingsService.Instance.UserDeltaToken != null)
            {
                try
                {
                    var delataRequest = userRequest.Request();
                    delataRequest.QueryOptions.Add(new QueryOption("$deltatoken", SettingsService.Instance.UserDeltaToken));
                    users = await delataRequest.GetAsync();
                }
                catch
                {
                    users = null;
                }
            }

            if(users == null)
            {
                users = await userRequest.Request().GetAsync();
            }

            while(true)
            {
                foreach(var user in users)
                {
                    var entry = new UserEntry
                    {
                        ReferenceId = user.Id,
                        ExternalId = user.Id,
                        Email = user.Mail ?? user.UserPrincipalName,
                        Disabled = !user.AccountEnabled.GetValueOrDefault(true)
                    };

                    if(FilterOutResult(filter, entry.Email))
                    {
                        continue;
                    }

                    if(user.AdditionalData.TryGetValue("@removed", out object deleted) && deleted.ToString().Contains("changed"))
                    {
                        entry.Deleted = true;
                    }
                    else if(!entry.Disabled && (entry?.Email?.Contains("#") ?? true))
                    {
                        continue;
                    }

                    entries.Add(entry);
                }

                if(users.NextPageRequest == null)
                {
                    if(users.AdditionalData.TryGetValue("@odata.deltaLink", out object deltaLink))
                    {
                        var deltaUriQuery = new Uri(deltaLink.ToString()).ParseQueryString();
                        if(deltaUriQuery["$deltatoken"] != null)
                        {
                            SettingsService.Instance.UserDeltaToken = deltaUriQuery["$deltatoken"];
                        }
                    }
                    break;
                }
                else
                {
                    users = await users.NextPageRequest.GetAsync();
                }
            }

            return entries;
        }

        private static Tuple<bool, HashSet<string>> CreateSetFromFilter(string filter)
        {
            if(string.IsNullOrWhiteSpace(filter))
            {
                return null;
            }

            var parts = filter.Split(':');
            if(parts.Length != 2)
            {
                return null;
            }

            var exclude = true;
            if(string.Equals(parts[0].Trim(), "include", StringComparison.InvariantCultureIgnoreCase))
            {
                exclude = false;
            }
            else if(string.Equals(parts[0].Trim(), "exclude", StringComparison.InvariantCultureIgnoreCase))
            {
                exclude = true;
            }
            else
            {
                return null;
            }

            var list = new HashSet<string>(parts[1].Split(',').Select(p => p.Trim()));
            return new Tuple<bool, HashSet<string>>(exclude, list);
        }

        private static bool FilterOutResult(Tuple<bool, HashSet<string>> filter, string result)
        {
            if(filter != null)
            {
                // excluded
                if(filter.Item1 && filter.Item2.Contains(result, StringComparer.InvariantCultureIgnoreCase))
                {
                    return true;
                }
                // included
                else if(!filter.Item1 && !filter.Item2.Contains(result, StringComparer.InvariantCultureIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
