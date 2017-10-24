using Bit.Core.Models;
using Newtonsoft.Json.Linq;
using System;
using System.Text;

namespace Bit.Core.Services
{
    public class TokenService
    {
        private static TokenService _instance;
        private static readonly DateTime _epoc = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        private string _accessToken;
        private dynamic _decodedAccessToken;

        private TokenService() { }

        public static TokenService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new TokenService();
                }

                return _instance;
            }
        }

        public string AccessToken
        {
            get
            {
                if(_accessToken != null)
                {
                    return _accessToken;
                }

                var encBytes = SettingsService.Instance.AccessToken;
                if(encBytes != null)
                {
                    _accessToken = Encoding.ASCII.GetString(encBytes.Decrypt());
                }

                return _accessToken;
            }
            set
            {
                _accessToken = value;
                if(_accessToken == null)
                {
                    SettingsService.Instance.AccessToken = null;
                }
                else
                {
                    var bytes = Encoding.ASCII.GetBytes(_accessToken);
                    SettingsService.Instance.AccessToken = new EncryptedData(bytes);
                    bytes = null;
                }
            }
        }

        public DateTime AccessTokenExpiration
        {
            get
            {
                var decoded = DecodeAccessToken();
                if(decoded?["exp"] == null)
                {
                    throw new InvalidOperationException("No exp in token.");
                }

                return _epoc.AddSeconds(Convert.ToDouble(decoded["exp"].Value<long>()));
            }
        }

        public bool AccessTokenExpired => DateTime.UtcNow < AccessTokenExpiration;
        public TimeSpan AccessTokenTimeRemaining => AccessTokenExpiration - DateTime.UtcNow;
        public bool AccessTokenNeedsRefresh => AccessTokenTimeRemaining.TotalMinutes < 5;
        public string AccessTokenUserId => DecodeAccessToken()?["sub"].Value<string>();
        public string AccessTokenEmail => DecodeAccessToken()?["email"].Value<string>();
        public string AccessTokenName => DecodeAccessToken()?["name"].Value<string>();

        public string RefreshToken
        {
            get
            {
                var encData = SettingsService.Instance.RefreshToken;
                if(encData != null)
                {
                    return Encoding.ASCII.GetString(encData.Decrypt());
                }

                return null;
            }
            set
            {
                if(value == null)
                {
                    SettingsService.Instance.RefreshToken = null;
                }
                else
                {
                    var bytes = Encoding.ASCII.GetBytes(value);
                    SettingsService.Instance.RefreshToken = new EncryptedData(bytes);
                    bytes = null;
                }
            }
        }

        public JObject DecodeAccessToken()
        {
            if(_decodedAccessToken != null)
            {
                return _decodedAccessToken;
            }

            if(AccessToken == null)
            {
                throw new InvalidOperationException($"{nameof(AccessToken)} not found.");
            }

            var parts = AccessToken.Split('.');
            if(parts.Length != 3)
            {
                throw new InvalidOperationException($"{nameof(AccessToken)} must have 3 parts");
            }

            var decodedBytes = Base64UrlDecode(parts[1]);
            if(decodedBytes == null || decodedBytes.Length < 1)
            {
                throw new InvalidOperationException($"{nameof(AccessToken)} must have 3 parts");
            }

            _decodedAccessToken = JObject.Parse(Encoding.UTF8.GetString(decodedBytes, 0, decodedBytes.Length));
            return _decodedAccessToken;
        }

        private static byte[] Base64UrlDecode(string input)
        {
            var output = input;
            // 62nd char of encoding
            output = output.Replace('-', '+');
            // 63rd char of encoding
            output = output.Replace('_', '/');
            // Pad with trailing '='s
            switch(output.Length % 4)
            {
                case 0:
                    // No pad chars in this case
                    break;
                case 2:
                    // Two pad chars
                    output += "=="; break;
                case 3:
                    // One pad char
                    output += "="; break;
                default:
                    throw new InvalidOperationException("Illegal base64url string!");
            }

            // Standard base64 decoder
            return Convert.FromBase64String(output);
        }
    }
}
