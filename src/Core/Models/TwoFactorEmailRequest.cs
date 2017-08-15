namespace Bit.Core.Models
{
    public class TwoFactorEmailRequest
    {
        public string Email { get; set; }
        public string MasterPasswordHash { get; set; }
    }
}
