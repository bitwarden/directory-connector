using System;
using System.Collections.Generic;
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
    }
}
