using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public abstract class Entry
    {
        public string DistinguishedName { get; set; }
        public DateTime? CreationDate { get; set; }
        public DateTime? RevisionDate { get; set; }
    }

    public class GroupEntry : Entry
    {
        public string Name { get; set; }
        public HashSet<string> Members { get; set; } = new HashSet<string>();
        public List<GroupEntry> GroupMembers { get; set; } = new List<GroupEntry>();
    }

    public class UserEntry : Entry
    {
        public string Email { get; set; }
        public List<GroupEntry> Groups { get; set; } = new List<GroupEntry>();
    }
}
