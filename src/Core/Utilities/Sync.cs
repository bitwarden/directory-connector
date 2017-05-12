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
        public static Task SyncGroupsAsync()
        {
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

            PrintSearchResults(result);

            return Task.FromResult(0);
        }

        public static Task SyncUsersAsync()
        {
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

            PrintSearchResults(result);

            return Task.FromResult(0);
        }

        public static async Task SyncAllAsync()
        {
            await SyncGroupsAsync();
            await SyncUsersAsync();
        }

        private static void PrintSearchResults(SearchResultCollection result)
        {
            foreach(SearchResult item in result)
            {
                Console.WriteLine(item.Path);

                foreach(DictionaryEntry prop in item.Properties)
                {
                    Console.Write("    " + prop.Key + ": ");

                    var vals = prop.Value as ResultPropertyValueCollection;
                    for(int i = 0; i < vals.Count; i++)
                    {
                        Console.Write(vals[i]);
                        if(i != vals.Count - 1)
                        {
                            Console.Write(" | ");
                        }
                    }

                    Console.Write("\n");
                }
            }
        }
    }
}
