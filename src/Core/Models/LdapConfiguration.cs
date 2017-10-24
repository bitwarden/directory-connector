using Bit.Core.Services;
using System;
#if NET461
using System.DirectoryServices;
#endif

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

#if NET461
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

        public DirectoryEntry GetBasePathDirectoryEntry()
        {
            var path = Path.Substring(Path.IndexOf("dc=", StringComparison.InvariantCultureIgnoreCase));
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
#endif

        private string ServerPath(string path)
        {
            return $"LDAP://{Address}:{Port}/{path}";
        }
    }
}
