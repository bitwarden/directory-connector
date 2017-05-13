using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class SyncResult
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public int GroupCount { get; set; }
        public int UserCount { get; set; }
    }
}
