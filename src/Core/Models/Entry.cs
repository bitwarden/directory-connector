using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public abstract class Entry
    {
        public string ReferenceId { get; set; }
        public string ExternalId { get; set; }
        public DateTime? CreationDate { get; set; }
        public DateTime? RevisionDate { get; set; }
    }

    public class GroupEntry : Entry
    {
        public string Name { get; set; }
        public HashSet<string> UserMemberExternalIds { get; set; } = new HashSet<string>();
        public HashSet<string> GroupMemberReferenceIds { get; set; } = new HashSet<string>();
    }

    public class UserEntry : Entry
    {
        public string Email { get; set; }
        public bool Disabled { get; set; }
        public bool Deleted { get; set; }
    }
}
