namespace Bit.Core.Models
{
    public class GSuiteConfiguration
    {
        public string SecretFile { get; set; } = "client_secret.json";
        public string Customer { get; set; }
        public string Domain { get; set; } = "yourcompany.com";
        public string AdminUser { get; set; } = "adminuser@yourcompany.com";
    }
}