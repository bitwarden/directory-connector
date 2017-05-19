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
                    break;
                case DirectoryType.Other:
                    break;
                case DirectoryType.GSuite:
                    break;
                default:
                    break;
            }
        }

        /* 
         * Depending on what server type you are using, filters are be one of the following:
         * 
         * 1. ActiveDirectory or Other
         *    - LDAP query/filter syntax
         *    - Read more at: http://bit.ly/2qyLpzW
         *    - ex. "(&(givenName=John)(|(l=Dallas)(l=Austin)))"
         *    
         * 2. AzureActiveDirectory
         *    - OData syntax for a Microsoft Graph query parameter '$filter'
         *    - Read more at http://bit.ly/2q3FOOD
         *    - ex. "startswith(displayName,'J')"
         *    
         * 3. GSuite
         *    - Group Filter
         *      - Custom filtering syntax that allows you to exclude or include a comma separated list of group names.
         *      - ex. "include:Group A,Sales People,My Other Group"
         *         or "exclude:Group C,Developers,Some Other Group"
         *    - User Filter
         *      - Custom filtering syntax that allows you to exclude or include a comma separated list of group names.
         *      - Allows you to concatenate a GSuite Admin API user search query to the end of the filter after delimiting
         *        the include/exclude filter with a pipe (|).
         *      - Read more at http://bit.ly/2rlTskX
         *      - ex. 
         *         or "include:joe@company.com,bill@company.com,tom@company.com"
         *         or "exclude:john@company.com,bill@company.com|orgName=Engineering orgTitle:Manager"
         *         or "|orgName=Engineering orgTitle:Manager"
         */

        public string GroupFilter { get; set; }
        public string UserFilter { get; set; }

        public bool SyncGroups { get; set; } = true;
        public bool SyncUsers { get; set; } = true;
        public int IntervalMinutes { get; set; } = 5;
        public bool RemoveDisabledUsers { get; set; }
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
