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
        public List<GroupEntry> Groups { get; set; }
        public List<UserEntry> Users { get; set; }
    }
}
