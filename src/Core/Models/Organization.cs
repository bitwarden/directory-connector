using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Models
{
    public class Organization
    {
        public Organization() { }

        public Organization(ProfileOrganizationResponseModel org)
        {
            Name = org.Name;
            Id = org.Id;
        } 

        public string Name { get; set; }
        public string Id { get; set; }
    }
}
