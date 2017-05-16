using System.Collections.Generic;
using System.Linq;

namespace Bit.Core.Models
{
    public class ImportRequest
    {
        public ImportRequest(List<GroupEntry> groups, List<UserEntry> users)
        {
            Groups = groups.Select(g => new Group(g)).ToArray();
            Users = users.Select(u => new User(u)).ToArray();
        }

        public Group[] Groups { get; set; }
        public User[] Users { get; set; }

        public class Group
        {
            public Group(GroupEntry entry)
            {
                Name = entry.Name;
                ExternalId = entry.ExternalId;
                Users = entry.Users;
            }

            public string Name { get; set; }
            public string ExternalId { get; set; }
            public IEnumerable<string> Users { get; set; }
        }

        public class User
        {
            public User(UserEntry entry)
            {
                Email = entry.Email;
                Disabled = entry.Disabled;
                ExternalId = entry.ExternalId;
            }

            public string ExternalId { get; set; }
            public string Email { get; set; }
            public bool Disabled { get; set; }
        }
    }

}
