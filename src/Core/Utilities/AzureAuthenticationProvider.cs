using Bit.Core.Services;
using Microsoft.Graph;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public class AzureAuthenticationProvider : IAuthenticationProvider
    {
        public async Task AuthenticateRequestAsync(HttpRequestMessage request)
        {
            if(SettingsService.Instance.Server?.Azure == null)
            {
                throw new ApplicationException("No server configuration.");
            }

            var authContext = new AuthenticationContext(
                $"https://login.windows.net/{SettingsService.Instance.Server.Azure.Tenant}/oauth2/token");
            var creds = new ClientCredential(SettingsService.Instance.Server.Azure.Id,
                SettingsService.Instance.Server.Azure.Secret.DecryptToString());
            var authResult = await authContext.AcquireTokenAsync("https://graph.microsoft.com/", creds);
            request.Headers.Add("Authorization", $"Bearer {authResult.AccessToken}");
        }

        // ref: https://github.com/AzureAD/azure-activedirectory-library-for-dotnet/issues/511
        private static void SomeMethodToLinkPlatform()
        {
            var creds = new UserPasswordCredential("user", "pass");
        }
    }
}
