using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class ServerConfiguration
    {
        public string Address { get; set; }
        public string Port { get; set; } = "389";
        public string Path { get; set; }
        public string Username { get; set; }
        public EncryptedData Password { get; set; }
        [JsonIgnore]
        public string ServerPath => $"LDAP://{Address}:{Port}/{Path}";
        public string GroupFilter { get; set; } = "(&(objectClass=group))";
        public string UserFilter { get; set; } = "(&(objectClass=person))";
        public bool SyncGroups { get; set; } = true;
        public bool SyncUsers { get; set; } = true;
        public string Type { get; set; } = "Active Directory";
        public string MemberAttribute { get; set; } = "memberOf";
        public string GroupNameAttribute { get; set; } = "name";
        public string UserEmailAttribute { get; set; } = "mail";
        public bool EmailPrefixSuffix { get; set; } = false;
        public string UserEmailPrefixAttribute { get; set; } = "sAMAccountName";
        public string UserEmailSuffix { get; set; } = "@companyname.com";
        public string CreationDateAttribute { get; set; } = "whenCreated";
        public string RevisionDateAttribute { get; set; } = "whenChanged";

        public DirectoryEntry GetDirectoryEntry()
        {
            var entry = new DirectoryEntry(ServerPath, Username, Password.DecryptToString(), AuthenticationTypes.None);
            return entry;
        }
    }
}
