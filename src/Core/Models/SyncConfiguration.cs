using Bit.Core.Enums;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.DirectoryServices;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class SyncConfiguration
    {
        public SyncConfiguration() { }

        public SyncConfiguration(DirectoryType type)
        {
            Ldap = new LdapSyncConfiguration(type);

            switch(type)
            {
                case DirectoryType.ActiveDirectory:
                    break;
                case DirectoryType.AzureActiveDirectory:
                    GroupFilter = null;
                    UserFilter = null;
                    break;
                case DirectoryType.Other:
                    IntervalMinutes = 60;
                    break;
                default:
                    break;
            }
        }

        public string GroupFilter { get; set; }
        public string UserFilter { get; set; }
        public bool SyncGroups { get; set; } = true;
        public bool SyncUsers { get; set; } = true;
        public int IntervalMinutes { get; set; } = 5;
        public LdapSyncConfiguration Ldap { get; set; } = new LdapSyncConfiguration();

        public class LdapSyncConfiguration
        {
            public LdapSyncConfiguration() { }

            public LdapSyncConfiguration(DirectoryType type)
            {
                switch(type)
                {
                    case DirectoryType.ActiveDirectory:
                        CreationDateAttribute = "whenCreated";
                        RevisionDateAttribute = "whenChanged";
                        UserEmailPrefixAttribute = "sAMAccountName";
                        UserPath = "CN=Users";
                        GroupPath = "CN=Users";
                        break;
                    case DirectoryType.Other:
                        break;
                    default:
                        break;
                }
            }

            public string UserPath { get; set; }
            public string GroupPath { get; set; }
            public string UserObjectClass { get; set; } = "person";
            public string GroupObjectClass { get; set; } = "group";
            public string MemberAttribute { get; set; } = "member";
            public string GroupNameAttribute { get; set; } = "name";
            public string UserEmailAttribute { get; set; } = "mail";
            public bool EmailPrefixSuffix { get; set; } = false;
            public string UserEmailPrefixAttribute { get; set; } = "cn";
            public string UserEmailSuffix { get; set; } = "@companyname.com";
            public string CreationDateAttribute { get; set; }
            public string RevisionDateAttribute { get; set; }
        }
    }
}
