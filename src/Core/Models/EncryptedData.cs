using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class EncryptedData
    {
        public EncryptedData() { }

        public EncryptedData(byte[] plainValue)
        {
            IV = RandomBytes();
#if NET461
            Value = ProtectedData.Protect(plainValue, IV, DataProtectionScope.LocalMachine);
#endif
        }

        public EncryptedData(string plainValue)
        {
            var bytes = Encoding.UTF8.GetBytes(plainValue);
            IV = RandomBytes();
#if NET461
            Value = ProtectedData.Protect(bytes, IV, DataProtectionScope.LocalMachine);
#endif
        }

        public byte[] Value { get; set; }
        public byte[] IV { get; set; }

        public byte[] Decrypt()
        {
#if NET461
            return ProtectedData.Unprotect(Value, IV, DataProtectionScope.LocalMachine);
#else
            return new byte[0];
#endif
        }

        public string DecryptToString()
        {
#if NET461
            var bytes = ProtectedData.Unprotect(Value, IV, DataProtectionScope.LocalMachine);
#else
            var bytes = new byte[0];
#endif
            return Encoding.UTF8.GetString(bytes);
        }

        private byte[] RandomBytes()
        {
            var entropy = new byte[16];
            new RNGCryptoServiceProvider().GetBytes(entropy);
            return entropy;
        }
    }
}
