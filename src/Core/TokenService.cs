using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core
{
    public class TokenService
    {
        private static TokenService _instance;

        private TokenService() { }

        public static TokenService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new TokenService();
                }

                return _instance;
            }
        }

        public string AccessToken
        {
            get
            {
                // TODO: get bytes from disc
                var encBytes = new byte[0];
                var bytes = ProtectedData.Unprotect(encBytes, RandomEntropy(), DataProtectionScope.CurrentUser);
                return Convert.ToBase64String(bytes);
            }
            set
            {
                var bytes = Convert.FromBase64String(value);
                var encBytes = ProtectedData.Protect(bytes, RandomEntropy(), DataProtectionScope.CurrentUser);
                // TODO: store bytes to disc
            }
        }

        public string RefreshToken { get; set; }

        private byte[] RandomEntropy()
        {
            var entropy = new byte[16];
            new RNGCryptoServiceProvider().GetBytes(entropy);
            return entropy;
        }
    }
}
