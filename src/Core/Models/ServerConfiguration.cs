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
        public Enums.DirectoryType Type { get; set; } = Enums.DirectoryType.ActiveDirectory;
        public LdapConfiguration Ldap { get; set; }
        public AzureConfiguration Azure { get; set; }
        public GSuiteConfiguration GSuite { get; set; }
    }
}
