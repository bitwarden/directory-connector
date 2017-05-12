using Bit.Core.Models;
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
        private static string _baseStoragePath = string.Concat(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "\\bitwarden\\DirectoryConnector");

        private IDictionary<string, object> _settings;

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

        public IDictionary<string, object> Settings
        {
            get
            {
                var filePath = $"{_baseStoragePath}\\settings.json";
                if(_settings == null && File.Exists(filePath))
                {
                    var serializer = new JsonSerializer();
                    using(var s = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                    using(var sr = new StreamReader(s, Encoding.UTF8))
                    using(var jsonTextReader = new JsonTextReader(sr))
                    {
                        _settings = serializer.Deserialize<IDictionary<string, object>>(jsonTextReader);
                    }
                }

                return _settings == null ? new Dictionary<string, object>() : _settings;
            }
            set
            {
                lock(_locker)
                {
                    if(!Directory.Exists(_baseStoragePath))
                    {
                        Directory.CreateDirectory(_baseStoragePath);
                    }

                    _settings = value;
                    var filePath = $"{_baseStoragePath}\\settings.json";
                    using(var s = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.Read))
                    using(var sw = new StreamWriter(s, Encoding.UTF8))
                    {
                        var json = JsonConvert.SerializeObject(_settings);
                        sw.Write(json);
                    }
                }
            }
        }

        public void Set(string key, object value)
        {
            if(Contains(key))
            {
                Settings[key] = value;
            }
            else
            {
                Settings.Add(key, value);
            }

            Settings = Settings;
        }

        public void Remove(string key)
        {
            Settings.Remove(key);
            Settings = Settings;
        }

        public bool Contains(string key)
        {
            return Settings.ContainsKey(key);
        }

        public T Get<T>(string key)
        {
            if(Settings.ContainsKey(key))
            {
                return (T)Settings[key];
            }

            return default(T);
        }

        public EncryptedData AccessToken
        {
            get
            {
                return Get<EncryptedData>("AccessToken");
            }
            set
            {
                if(value == null)
                {
                    Remove("AccessTolen");
                    return;
                }

                Set("AccessToken", value);
            }
        }

        public EncryptedData RefreshToken
        {
            get
            {
                return Get<EncryptedData>("RefreshToken");
            }
            set
            {
                if(value == null)
                {
                    Remove("RefreshToken");
                    return;
                }

                Set("RefreshToken", value);
            }
        }
    }
}
