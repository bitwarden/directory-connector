using Bit.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Services
{
    public interface IDirectoryService
    {
        Task<Tuple<List<GroupEntry>, List<UserEntry>>> GetEntriesAsync(bool force = false);
    }
}
