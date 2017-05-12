using Bit.Core.Models;
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

        public async Task<LoginResult> LogInAsync(string email, string masterPassword)
        {
            var normalizedEmail = email.Trim().ToLower();
            var key = CryptoService.Instance.MakeKeyFromPassword(masterPassword, normalizedEmail);

            var request = new TokenRequest
            {
                Email = normalizedEmail,
                MasterPasswordHash = CryptoService.Instance.HashPasswordBase64(key, masterPassword)
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

            await ProcessLogInSuccessAsync(response.Result);
            return result;
        }

        public async Task<LoginResult> LogInTwoFactorAsync(string token, string email, string masterPasswordHash)
        {
            var request = new TokenRequest
            {
                Email = email.Trim().ToLower(),
                MasterPasswordHash = masterPasswordHash,
                Token = token.Trim().Replace(" ", ""),
                Provider = 0 // Authenticator app (only 1 provider for now, so hard coded)
            };

            var response = await ApiService.Instance.PostTokenAsync(request);

            var result = new LoginResult();
            if(!response.Succeeded)
            {
                result.Success = false;
                result.ErrorMessage = response.Errors.FirstOrDefault()?.Message;
                return result;
            }

            result.Success = true;
            await ProcessLogInSuccessAsync(response.Result);
            return result;
        }

        private Task ProcessLogInSuccessAsync(TokenResponse response)
        {
            TokenService.Instance.AccessToken = response.AccessToken;
            TokenService.Instance.RefreshToken = response.RefreshToken;
            return Task.FromResult(0);
        }
    }
}
