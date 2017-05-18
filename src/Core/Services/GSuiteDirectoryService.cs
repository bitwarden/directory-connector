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
using System.Threading;
using Google.Apis.Util.Store;

namespace Bit.Core.Services
{
    public class GSuiteDirectoryService : IDirectoryService
    {
        private static GSuiteDirectoryService _instance;
        private static DirectoryService _service;

        private GSuiteDirectoryService()
        {
            //GoogleCredential creds;
            UserCredential creds;

            var secretFilePath = Path.Combine(Constants.BaseStoragePath, SettingsService.Instance.Server.GSuite.SecretFile);
            using(var stream = new FileStream(secretFilePath, FileMode.Open, FileAccess.Read))
            {
                var scopes = new List<string>
                {
                    DirectoryService.Scope.AdminDirectoryUserReadonly,
                    DirectoryService.Scope.AdminDirectoryGroupReadonly,
                    DirectoryService.Scope.AdminDirectoryGroupMemberReadonly
                };

                //creds = GoogleCredential.FromStream(stream).CreateScoped(scopes);

                var credsPath = Path.Combine(Constants.BaseStoragePath, "gsuite_credentials");
                creds = GoogleWebAuthorizationBroker.AuthorizeAsync(
                    GoogleClientSecrets.Load(stream).Secrets,
                    scopes,
                    "user",
                    CancellationToken.None,
                    new FileDataStore(credsPath, true)).Result;
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

        private async Task<List<GroupEntry>> GetGroupsAsync(bool force)
        {
            var entries = new List<GroupEntry>();

            var request = _service.Groups.List();
            request.Domain = SettingsService.Instance.Server.GSuite.Domain;
            request.Customer = SettingsService.Instance.Server.GSuite.Customer;
            var groups = await request.ExecuteAsync();

            if(groups.GroupsValue != null)
            {
                foreach(var group in groups.GroupsValue)
                {
                    // TODO: Group filter?

                    var entry = await BuildGroupAsync(group);
                    entries.Add(entry);
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
                Name = group.Name
            };

            var memberRequest = _service.Members.List(group.Id);
            var members = await memberRequest.ExecuteAsync();

            if(members.MembersValue != null)
            {
                foreach(var member in members.MembersValue)
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
            }

            return entry;
        }

        private async Task<List<UserEntry>> GetUsersAsync(bool force)
        {
            var entries = new List<UserEntry>();

            var request = _service.Users.List();
            request.Domain = SettingsService.Instance.Server.GSuite.Domain;
            request.Customer = SettingsService.Instance.Server.GSuite.Customer;
            request.Query = SettingsService.Instance.Sync.UserFilter;
            var users = await request.ExecuteAsync();

            if(users.UsersValue != null)
            {
                foreach(var user in users.UsersValue)
                {
                    var entry = BuildUser(user, false);
                    if(entry != null)
                    {
                        entries.Add(entry);
                    }
                }
            }

            var deletedRequest = _service.Users.List();
            request.Domain = SettingsService.Instance.Server.GSuite.Domain;
            request.Customer = SettingsService.Instance.Server.GSuite.Customer;
            request.Query = SettingsService.Instance.Sync.UserFilter;
            request.ShowDeleted = "true";
            var deletedUsers = await request.ExecuteAsync();

            if(deletedUsers.UsersValue != null)
            {
                foreach(var user in deletedUsers.UsersValue)
                {
                    var entry = BuildUser(user, true);
                    if(entry != null)
                    {
                        entries.Add(entry);
                    }
                }
            }

            return entries;
        }

        private UserEntry BuildUser(User user, bool deleted)
        {
            var entry = new UserEntry
            {
                ReferenceId = user.Id,
                ExternalId = user.Id,
                Email = user.PrimaryEmail,
                Disabled = user.Suspended.GetValueOrDefault(false),
                Deleted = deleted
            };

            if(string.IsNullOrWhiteSpace(entry.Email) && !entry.Deleted)
            {
                return null;
            }

            return entry;
        }
    }
}
