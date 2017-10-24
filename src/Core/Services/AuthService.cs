using Bit.Core.Enums;
using Bit.Core.Models;
using Bit.Core.Utilities;
using System.Linq;
using System.Threading.Tasks;

namespace Bit.Core.Services
{
    public class AuthService
    {
        private static AuthService _instance;

        private AuthService() { }

        public static AuthService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new AuthService();
                }

                return _instance;
            }
        }

        public bool Authenticated => !string.IsNullOrWhiteSpace(TokenService.Instance.AccessToken);
        public bool OrganizationSet => SettingsService.Instance.Organization != null;

        public void LogOut()
        {
            TokenService.Instance.AccessToken = null;
            TokenService.Instance.RefreshToken = null;
        }

        public async Task<LoginResult> LogInAsync(string email, string masterPassword)
        {
            var normalizedEmail = email.Trim().ToLower();
            var key = Crypto.MakeKeyFromPassword(masterPassword, normalizedEmail);

            var request = new TokenRequest
            {
                Email = normalizedEmail,
                MasterPasswordHash = Crypto.HashPasswordBase64(key, masterPassword)
            };

            var response = await ApiService.Instance.PostTokenAsync(request);

            masterPassword = null;
            key = null;

            var result = new LoginResult();
            if(!response.Succeeded)
            {
                result.Success = false;
                result.ErrorMessage = response.Errors.FirstOrDefault()?.Message;
                return result;
            }

            result.Success = true;
            if(response.Result.TwoFactorProviders2 != null && response.Result.TwoFactorProviders2.Count > 0)
            {
                result.TwoFactorProviders = response.Result.TwoFactorProviders2;
                result.MasterPasswordHash = request.MasterPasswordHash;
                return result;
            }

            return await ProcessLogInSuccessAsync(response.Result);
        }

        public async Task<LoginResult> LogInTwoFactorAsync(TwoFactorProviderType type, string token, string email,
            string masterPassword)
        {
            var normalizedEmail = email.Trim().ToLower();
            var key = Crypto.MakeKeyFromPassword(masterPassword, normalizedEmail);

            var result = await LogInTwoFactorWithHashAsync(type, token, email, Crypto.HashPasswordBase64(key, masterPassword));

            key = null;
            masterPassword = null;

            return result;
        }

        public async Task<LoginResult> LogInTwoFactorWithHashAsync(TwoFactorProviderType type, string token, string email,
            string masterPasswordHash)
        {
            if(type == TwoFactorProviderType.Email || type == TwoFactorProviderType.Authenticator)
            {
                token = token.Trim().Replace(" ", "");
            }

            var request = new TokenRequest
            {
                Email = email.Trim().ToLower(),
                MasterPasswordHash = masterPasswordHash,
                Token = token,
                Provider = type,
                Remember = false
            };

            var response = await ApiService.Instance.PostTokenAsync(request);

            if(!response.Succeeded)
            {
                var result = new LoginResult();
                result.Success = false;
                result.ErrorMessage = response.Errors.FirstOrDefault()?.Message;
                return result;
            }

            return await ProcessLogInSuccessAsync(response.Result);
        }

        private async Task<LoginResult> ProcessLogInSuccessAsync(TokenResponse response)
        {
            TokenService.Instance.AccessToken = response.AccessToken;
            TokenService.Instance.RefreshToken = response.RefreshToken;

            var result = new LoginResult();

            var profile = await ApiService.Instance.GetProfileAsync();
            if(profile.Succeeded)
            {
                var adminOrgs = profile.Result.Organizations.Where(o =>
                    o.Status == OrganizationUserStatusType.Confirmed &&
                    o.Type != OrganizationUserType.User);
                if(!adminOrgs.Any())
                {
                    LogOut();
                    result.Success = false;
                    result.ErrorMessage = "You are not an admin of any organizations.";
                    return result;
                }

                result.Organizations = adminOrgs.Select(o => new Organization(o)).ToList();
                if(result.Organizations.Count == 1)
                {
                    SettingsService.Instance.Organization = new Organization(adminOrgs.First());
                }

                result.Success = true;
                return result;
            }
            else
            {
                LogOut();
                result.Success = false;
                result.ErrorMessage = "Could not load profile.";
                return result;
            }
        }
    }
}
