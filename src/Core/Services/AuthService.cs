using Bit.Core.Enums;
using Bit.Core.Models;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Text;
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
            if(response.Result.TwoFactorProviders != null && response.Result.TwoFactorProviders.Count > 0)
            {
                result.TwoFactorRequired = true;
                result.MasterPasswordHash = request.MasterPasswordHash;
                return result;
            }

            return await ProcessLogInSuccessAsync(response.Result);
        }

        public async Task<LoginResult> LogInTwoFactorAsync(string token, string email, string masterPassword)
        {
            var normalizedEmail = email.Trim().ToLower();
            var key = Crypto.MakeKeyFromPassword(masterPassword, normalizedEmail);

            var result = await LogInTwoFactorWithHashAsync(token, email, Crypto.HashPasswordBase64(key, masterPassword));

            key = null;
            masterPassword = null;

            return result;
        }

        public async Task<LoginResult> LogInTwoFactorWithHashAsync(string token, string email, string masterPasswordHash)
        {
            var request = new TokenRequest
            {
                Email = email.Trim().ToLower(),
                MasterPasswordHash = masterPasswordHash,
                Token = token.Trim().Replace(" ", ""),
                Provider = 0 // Authenticator app (only 1 provider for now, so hard coded)
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
