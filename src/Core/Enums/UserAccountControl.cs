using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Enums
{
    [Flags]
    public enum UserAccountControl : int
    {
        AccountDisabled = 0x00000002,
        LockOut = 0x00000010,
    }
}
