using Bit.Core.Services;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class LdapConfiguration
    {
        public string Address { get; set; }
        public string Port { get; set; } = "389";
        public string Path { get; set; }
        public string Username { get; set; }
        public EncryptedData Password { get; set; }
        public Enums.DirectoryType Type { get; set; } = Enums.DirectoryType.ActiveDirectory;

        public DirectoryEntry GetUserDirectoryEntry()
        {
            return GetPathedDirectoryEntry(SettingsService.Instance.Sync.Ldap.UserPath);
        }

        public DirectoryEntry GetGroupDirectoryEntry()
        {
            return GetPathedDirectoryEntry(SettingsService.Instance.Sync.Ldap.GroupPath);
        }

        public DirectoryEntry GetPathedDirectoryEntry(string pathPrefix = null)
        {
            var path = Path;
            if(!string.IsNullOrWhiteSpace(pathPrefix))
            {
                path = string.Concat(pathPrefix, ",", path);
            }

            return GetDirectoryEntry(path);
        }

        public DirectoryEntry GetDirectoryEntry(string path = null)
        {
            if(Password == null && string.IsNullOrWhiteSpace(Username))
            {
                return new DirectoryEntry(ServerPath(path));
            }
            else
            {
                return new DirectoryEntry(ServerPath(path), Username, Password.DecryptToString(), AuthenticationTypes.None);
            }
        }

        private string ServerPath(string path)
        {
            return $"LDAP://{Address}:{Port}/{path}";
        }
    }
}
