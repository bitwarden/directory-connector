using Bit.Core.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class LoginResult
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public bool TwoFactorRequired => TwoFactorProviders != null && TwoFactorProviders.Count > 0;
        public Dictionary<TwoFactorProviderType, Dictionary<string, object>> TwoFactorProviders { get; set; }
        public string MasterPasswordHash { get; set; }
        public List<Organization> Organizations { get; set; }
    }
}
