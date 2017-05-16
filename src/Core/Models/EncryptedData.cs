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
            Value = ProtectedData.Protect(plainValue, IV, DataProtectionScope.LocalMachine);
        }

        public EncryptedData(string plainValue)
        {
            var bytes = Encoding.UTF8.GetBytes(plainValue);
            IV = RandomBytes();
            Value = ProtectedData.Protect(bytes, IV, DataProtectionScope.LocalMachine);
        }

        public byte[] Value { get; set; }
        public byte[] IV { get; set; }

        public byte[] Decrypt()
        {
            return ProtectedData.Unprotect(Value, IV, DataProtectionScope.CurrentUser);
        }

        public string DecryptToString()
        {
            var bytes = ProtectedData.Unprotect(Value, IV, DataProtectionScope.CurrentUser);
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
