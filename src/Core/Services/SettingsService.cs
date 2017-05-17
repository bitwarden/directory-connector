using Bit.Core.Models;
using Bit.Core.Utilities;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security;
using System.Text;
using System.Threading.Tasks;

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
                }

                return _settings == null ? new SettingsModel() : _settings;
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

                _settings = Settings;
                var filePath = $"{Constants.BaseStoragePath}\\settings.json";
                using(var s = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.Read))
                using(var sw = new StreamWriter(s, Encoding.UTF8))
                {
                    var json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                    sw.Write(json);
                }
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
                Settings.ApiBaseUrl = value;
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
                Settings.IdentityBaseUrl = value;
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
                Settings.AccessToken = value;
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
                Settings.RefreshToken = value;
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
                Settings.Organization = value;
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
                Settings.Server = value;
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
                Settings.Sync = value;
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
                Settings.LastGroupSyncDate = value;
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
                Settings.LastUserSyncDate = value;
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
                Settings.GroupDeltaToken = value;
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
                Settings.UserDeltaToken = value;
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
        }
    }
}
