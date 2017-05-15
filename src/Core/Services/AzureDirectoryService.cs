using Bit.Core.Models;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Graph;
using System.Net.Http.Headers;
using System.Diagnostics;
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

            return new Tuple<List<GroupEntry>, List<UserEntry>>(groups, users);
        }

        private async static Task<List<GroupEntry>> GetGroupsAsync(bool force = false)
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

            var groups = await _graphClient.Groups.Request().Select("id,displayName").GetAsync();
            foreach(var group in groups)
            {
                var entry = new GroupEntry
                {
                    Id = group.Id,
                    Name = group.DisplayName
                };

                var members = await _graphClient.Groups[group.Id].Members.Request().Select("id").GetAsync();
                foreach(var member in members)
                {
                    entry.Members.Add(member.Id);
                }

                entries.Add(entry);
            }

            return entries;
        }

        private async static Task<List<UserEntry>> GetUsersAsync(bool force = false)
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

            var users = await _graphClient.Users.Request().Select("id,mail,userPrincipalName,accountEnabled").GetAsync();
            foreach(var user in users)
            {
                var entry = new UserEntry
                {
                    Id = user.Id,
                    Email = user.Mail ?? user.UserPrincipalName,
                    Disabled = !user.AccountEnabled.GetValueOrDefault(true)
                };

                if(entry.Email.Contains("#"))
                {
                    continue;
                }

                entries.Add(entry);
            }

            return entries;
        }
    }
}
