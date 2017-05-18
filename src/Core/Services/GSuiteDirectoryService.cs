using Bit.Core.Models;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Bit.Core.Services
{
    public class GSuiteDirectoryService : IDirectoryService
    {
        private static GSuiteDirectoryService _instance;

        private GSuiteDirectoryService()
        {
           
        }

        public static IDirectoryService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new GSuiteDirectoryService();
                }

                return _instance;
            }
        }

        public Task<Tuple<List<GroupEntry>, List<UserEntry>>> GetEntriesAsync(bool force = false)
        {
            throw new NotImplementedException();
        }
    }
}
