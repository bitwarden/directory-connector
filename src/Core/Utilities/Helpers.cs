using System.Security.Principal;

namespace Bit.Core.Utilities
{
    public static class Helpers
    {
        public static bool IsAdministrator()
        {
#if NET461
            var identity = WindowsIdentity.GetCurrent();
            var principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
#else
            return false;
#endif
        }
    }
}
