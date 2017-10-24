using Bit.Core.Models;
using Bit.Core.Utilities;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Text;

namespace Bit.Core.Services
{
    public class SettingsService
    {
        private static SettingsService _instance;
        private static object _locker = new object();

        private SettingsModel _settings;

        private SettingsService() { }

        public static SettingsService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new SettingsService();
                }

                return _instance;
            }
        }

        private SettingsModel Settings
        {
            get
            {
                var filePath = $"{Constants.BaseStoragePath}\\settings.json";
                if(_settings == null && File.Exists(filePath))
                {
                    var serializer = new JsonSerializer();
                    using(var s = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                    using(var sr = new StreamReader(s, Encoding.UTF8))
                    using(var jsonTextReader = new JsonTextReader(sr))
                    {
                        _settings = serializer.Deserialize<SettingsModel>(jsonTextReader);
                    }

                    return _settings;
                }

                InitSettings();
                return _settings;
            }
        }

        private void SaveSettings()
        {
            lock(_locker)
            {
                if(!Directory.Exists(Constants.BaseStoragePath))
                {
                    Directory.CreateDirectory(Constants.BaseStoragePath);
                }

                var filePath = $"{Constants.BaseStoragePath}\\settings.json";
                using(var s = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.Read))
                using(var sw = new StreamWriter(s, Encoding.UTF8))
                {
                    var json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                    sw.Write(json);
                }
            }
        }

        private void InitSettings()
        {
            if(_settings == null)
            {
                _settings = new SettingsModel();
            }
        }

        public string ApiBaseUrl
        {
            get
            {
                return Settings.ApiBaseUrl;
            }
            set
            {
                InitSettings();
                _settings.ApiBaseUrl = value;
                SaveSettings();
            }
        }

        public string IdentityBaseUrl
        {
            get
            {
                return Settings.IdentityBaseUrl;
            }
            set
            {
                InitSettings();
                _settings.IdentityBaseUrl = value;
                SaveSettings();
            }
        }

        public EncryptedData AccessToken
        {
            get
            {
                return Settings.AccessToken;
            }
            set
            {
                InitSettings();
                _settings.AccessToken = value;
                SaveSettings();
            }
        }

        public EncryptedData RefreshToken
        {
            get
            {
                return Settings.RefreshToken;
            }
            set
            {
                InitSettings();
                _settings.RefreshToken = value;
                SaveSettings();
            }
        }

        public Organization Organization
        {
            get
            {
                return Settings.Organization;
            }
            set
            {
                InitSettings();
                _settings.Organization = value;
                SaveSettings();
            }
        }

        public ServerConfiguration Server
        {
            get
            {
                return Settings.Server;
            }
            set
            {
                InitSettings();
                _settings.Server = value;
                SaveSettings();
            }
        }

        public SyncConfiguration Sync
        {
            get
            {
                return Settings.Sync;
            }
            set
            {
                InitSettings();
                _settings.Sync = value;
                SaveSettings();
            }
        }

        public DateTime? LastGroupSyncDate
        {
            get
            {
                return Settings.LastGroupSyncDate;
            }
            set
            {
                InitSettings();
                _settings.LastGroupSyncDate = value;
                SaveSettings();
            }
        }

        public DateTime? LastUserSyncDate
        {
            get
            {
                return Settings.LastUserSyncDate;
            }
            set
            {
                InitSettings();
                _settings.LastUserSyncDate = value;
                SaveSettings();
            }
        }

        public string GroupDeltaToken
        {
            get
            {
                return Settings.GroupDeltaToken;
            }
            set
            {
                InitSettings();
                _settings.GroupDeltaToken = value;
                SaveSettings();
            }
        }

        public string UserDeltaToken
        {
            get
            {
                return Settings.UserDeltaToken;
            }
            set
            {
                InitSettings();
                _settings.UserDeltaToken = value;
                SaveSettings();
            }
        }

        public string LastSyncHash
        {
            get
            {
                return Settings.LastSyncHash;
            }
            set
            {
                InitSettings();
                _settings.LastSyncHash = value;
                SaveSettings();
            }
        }

        public class SettingsModel
        {
            public string ApiBaseUrl { get; set; } = "https://api.bitwarden.com";
            public string IdentityBaseUrl { get; set; } = "https://identity.bitwarden.com";
            public EncryptedData AccessToken { get; set; }
            public EncryptedData RefreshToken { get; set; }
            public ServerConfiguration Server { get; set; } = new ServerConfiguration();
            public SyncConfiguration Sync { get; set; } = new SyncConfiguration(Enums.DirectoryType.ActiveDirectory);
            public Organization Organization { get; set; } = new Organization();
            public DateTime? LastGroupSyncDate { get; set; }
            public DateTime? LastUserSyncDate { get; set; }
            public string GroupDeltaToken { get; set; }
            public string UserDeltaToken { get; set; }
            public string LastSyncHash { get; set; }
        }
    }
}
