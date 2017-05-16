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
            switch(type)
            {
                case DirectoryType.ActiveDirectory:
                    MemberAttribute = "memberOf";
                    CreationDateAttribute = "whenCreated";
                    RevisionDateAttribute = "whenChanged";
                    UserEmailPrefixAttribute = "sAMAccountName";
                    break;
                case DirectoryType.AzureActiveDirectory:
                    GroupFilter = null;
                    UserFilter = null;
                    MemberAttribute = null;
                    GroupNameAttribute = null;
                    UserEmailAttribute = null;
                    UserEmailPrefixAttribute = null;
                    UserEmailSuffix = null;
                    break;
                case DirectoryType.Other:
                    IntervalMinutes = 30;
                    break;
                default:
                    break;
            }
        }

        public string GroupFilter { get; set; } = "(&(objectClass=group))";
        public string UserFilter { get; set; } = "(&(objectClass=person))";
        public bool SyncGroups { get; set; } = true;
        public bool SyncUsers { get; set; } = true;
        public string MemberAttribute { get; set; } = "member";
        public string GroupNameAttribute { get; set; } = "name";
        public string UserEmailAttribute { get; set; } = "mail";
        public bool EmailPrefixSuffix { get; set; } = false;
        public string UserEmailPrefixAttribute { get; set; } = "cn";
        public string UserEmailSuffix { get; set; } = "@companyname.com";
        public string CreationDateAttribute { get; set; }
        public string RevisionDateAttribute { get; set; }
        public int IntervalMinutes { get; set; } = 5;
    }
}
