using Bit.Core.Models;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using Google.Apis.Admin.Directory.directory_v1;
using Google.Apis.Services;
using Google.Apis.Auth.OAuth2;
using System.IO;
using Bit.Core.Utilities;
using System.Linq;
using Google.Apis.Admin.Directory.directory_v1.Data;
using Google.Apis.Requests;

namespace Bit.Core.Services
{
    public class GSuiteDirectoryService : IDirectoryService
    {
        private static GSuiteDirectoryService _instance;
        private static DirectoryService _service;

        private GSuiteDirectoryService()
        {
            ICredential creds;

            var secretFilePath = Path.Combine(Constants.BaseStoragePath, SettingsService.Instance.Server.GSuite.SecretFile);
            using(var stream = new FileStream(secretFilePath, FileMode.Open, FileAccess.Read))
            {
                var scopes = new List<string>
                {
                    DirectoryService.Scope.AdminDirectoryUserReadonly,
                    DirectoryService.Scope.AdminDirectoryGroupReadonly,
                    DirectoryService.Scope.AdminDirectoryGroupMemberReadonly
                };

                creds = GoogleCredential.FromStream(stream)
                    .CreateScoped(scopes)
                    .CreateWithUser(SettingsService.Instance.Server.GSuite.AdminUser);
            }

            _service = new DirectoryService(new BaseClientService.Initializer
            {
                HttpClientInitializer = creds,
                ApplicationName = Constants.ProgramName
            });
        }

        public static IDirectoryService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new GSuiteDirectoryService();
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

            if(SettingsService.Instance.Server?.GSuite == null)
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
                groups = await GetGroupsAsync(force || (users?.Any(u => !u.Deleted && !u.Disabled) ?? false));
            }

            return new Tuple<List<GroupEntry>, List<UserEntry>>(groups, users);
        }

        private Task<List<GroupEntry>> GetGroupsAsync(bool force)
        {
            var entries = new List<GroupEntry>();

            var request = _service.Groups.List();
            request.Domain = SettingsService.Instance.Server.GSuite.Domain;
            request.Customer = SettingsService.Instance.Server.GSuite.Customer;

            var pageStreamer = new PageStreamer<Group, GroupsResource.ListRequest, Groups, string>(
                (req, token) => req.PageToken = token,
                res => res.NextPageToken,
                res => res.GroupsValue);

            var filter = CreateSetFromFilter(SettingsService.Instance.Sync.GroupFilter);
            foreach(var group in pageStreamer.Fetch(request))
            {
                if(FilterOutResult(filter, group.Name))
                {
                    continue;
                }

                var entry = BuildGroup(group);
                entries.Add(entry);
            }

            return Task.FromResult(entries);
        }

        private static GroupEntry BuildGroup(Group group)
        {
            var entry = new GroupEntry
            {
                ReferenceId = group.Id,
                ExternalId = group.Id,
                Name = group.Name
            };

            var memberRequest = _service.Members.List(group.Id);
            var pageStreamer = new PageStreamer<Member, MembersResource.ListRequest, Members, string>(
                (req, token) => req.PageToken = token,
                res => res.NextPageToken,
                res => res.MembersValue);

            foreach(var member in pageStreamer.Fetch(memberRequest))
            {
                if(!member.Role.Equals("member", StringComparison.InvariantCultureIgnoreCase) ||
                        !member.Status.Equals("active", StringComparison.InvariantCultureIgnoreCase))
                {
                    continue;
                }

                if(member.Type.Equals("user", StringComparison.InvariantCultureIgnoreCase))
                {
                    entry.UserMemberExternalIds.Add(member.Id);
                }
                else if(member.Type.Equals("group", StringComparison.InvariantCultureIgnoreCase))
                {
                    entry.GroupMemberReferenceIds.Add(member.Id);
                }
            }

            return entry;
        }

        private Task<List<UserEntry>> GetUsersAsync(bool force)
        {
            var entries = new List<UserEntry>();
            var query = CreateGSuiteQueryFromFilter(SettingsService.Instance.Sync.UserFilter);

            var request = _service.Users.List();
            request.Domain = SettingsService.Instance.Server.GSuite.Domain;
            request.Customer = SettingsService.Instance.Server.GSuite.Customer;
            request.Query = query;

            var pageStreamer = new PageStreamer<User, UsersResource.ListRequest, Users, string>(
                (req, token) => req.PageToken = token,
                res => res.NextPageToken,
                res => res.UsersValue);

            var filter = CreateSetFromFilter(SettingsService.Instance.Sync.UserFilter);
            foreach(var user in pageStreamer.Fetch(request))
            {
                if(FilterOutResult(filter, user.PrimaryEmail))
                {
                    continue;
                }

                var entry = BuildUser(user, false);
                if(entry != null)
                {
                    entries.Add(entry);
                }
            }

            var deletedRequest = _service.Users.List();
            deletedRequest.Domain = SettingsService.Instance.Server.GSuite.Domain;
            deletedRequest.Customer = SettingsService.Instance.Server.GSuite.Customer;
            deletedRequest.Query = query;
            deletedRequest.ShowDeleted = "true";

            var deletedPageStreamer = new PageStreamer<User, UsersResource.ListRequest, Users, string>(
                (req, token) => req.PageToken = token,
                res => res.NextPageToken,
                res => res.UsersValue);

            foreach(var user in deletedPageStreamer.Fetch(deletedRequest))
            {
                if(FilterOutResult(filter, user.PrimaryEmail))
                {
                    continue;
                }

                var entry = BuildUser(user, true);
                if(entry != null)
                {
                    entries.Add(entry);
                }
            }

            return Task.FromResult(entries);
        }

        private UserEntry BuildUser(User user, bool deleted)
        {
            var entry = new UserEntry
            {
                ReferenceId = user.Id,
                ExternalId = user.Id,
                Email = user.PrimaryEmail,
                Disabled = user.Suspended.GetValueOrDefault(false),
                Deleted = deleted,
                CreationDate = user.CreationTime
            };

            if(string.IsNullOrWhiteSpace(entry.Email) && !entry.Deleted)
            {
                return null;
            }

            return entry;
        }

        private string CreateGSuiteQueryFromFilter(string filter)
        {
            if(string.IsNullOrWhiteSpace(filter))
            {
                return null;
            }

            var mainParts = filter.Split('|');
            if(mainParts.Count() < 2 || string.IsNullOrWhiteSpace(mainParts[1]))
            {
                return null;
            }

            return mainParts[1].Trim();
        }

        private Tuple<bool, HashSet<string>> CreateSetFromFilter(string filter)
        {
            if(string.IsNullOrWhiteSpace(filter))
            {
                return null;
            }

            var mainParts = filter.Split('|');
            if(mainParts.Count() < 1 || string.IsNullOrWhiteSpace(mainParts[0]))
            {
                return null;
            }

            var parts = mainParts[0].Split(':');
            if(parts.Count() != 2)
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

        private bool FilterOutResult(Tuple<bool, HashSet<string>> filter, string result)
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
