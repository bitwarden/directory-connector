using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public static class Constants
    {
        public static string BaseStoragePath = string.Concat(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "\\bitwarden\\Directory Connector");

        public const string ProgramName = "bitwarden Directory Connector";
    }
}
