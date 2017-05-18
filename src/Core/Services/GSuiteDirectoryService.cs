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

namespace Bit.Core.Services
{
    public class GSuiteDirectoryService : IDirectoryService
    {
        private static GSuiteDirectoryService _instance;
        private static DirectoryService _service;

        private GSuiteDirectoryService()
        {
            GoogleCredential creds;
            using(var stream = new FileStream(SettingsService.Instance.Server.GSuite.SecretFile, FileMode.Open))
            {
                creds = GoogleCredential.FromStream(stream).CreateScoped(
                    DirectoryService.Scope.AdminDirectoryUserReadonly,
                    DirectoryService.Scope.AdminDirectoryGroupReadonly);
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
            return new List<GroupEntry>();
        }

        private async Task<List<UserEntry>> GetUsersAsync(bool force)
        {
            return new List<UserEntry>();
        }
    }
}
