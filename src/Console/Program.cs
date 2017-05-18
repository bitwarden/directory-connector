using Bit.Core.Models;
using Bit.Core.Services;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security;
using System.Text;
using System.Threading.Tasks;
using Con = System.Console;

namespace Bit.Console
{
    class Program
    {
        private static bool _usingArgs = false;
        private static bool _exit = false;
        private static string[] _args = null;

        static void Main(string[] args)
        {
            MainAsync(args).Wait();
        }

        private static async Task MainAsync(string[] args)
        {
            _args = args;
            _usingArgs = args.Length > 0;
            string selection = null;

            Con.ForegroundColor = ConsoleColor.DarkCyan;
            Con.WriteLine(@" _     _ _                         _            
| |__ (_) |___      ____ _ _ __ __| | ___ _ __  
| '_ \| | __\ \ /\ / / _` | '__/ _` |/ _ \ '_ \ 
| |_) | | |_ \ V  V / (_| | | | (_| |  __/ | | |
|_.__/|_|\__| \_/\_/ \__,_|_|  \__,_|\___|_| |_|");
            Con.ResetColor();
            Con.WriteLine();
            Con.WriteLine(Constants.ProgramName);
            Con.WriteLine("Copyright 2015-{0}, 8bit Solutions LLC", DateTime.Now.Year);
            Con.WriteLine();
            Con.WriteLine("https://bitwarden.com");
            Con.WriteLine("https://github.com/bitwarden/directory-connector");
            Con.WriteLine();

            while(true)
            {
                Con.ResetColor();

                if(_usingArgs)
                {
                    selection = args[0];
                }
                else
                {
                    Con.WriteLine("Main Menu");
                    Con.WriteLine("=================================");
                    Con.WriteLine("1. Log in to bitwarden");
                    Con.WriteLine("2. Log out");
                    Con.WriteLine("3. Configure directory connection");
                    Con.WriteLine("4. Configure sync");
                    Con.WriteLine("5. Simulate directory sync");
                    Con.WriteLine("6. Sync directory");
                    Con.WriteLine("7. Control background service");
                    Con.WriteLine("8. Set environment");
                    Con.WriteLine("9. Exit");
                    Con.WriteLine();
                    Con.Write("What would you like to do? ");
                    selection = Con.ReadLine();
                    Con.WriteLine();
                }

                switch(selection)
                {
                    case "1":
                    case "login":
                    case "signin":
                        await LogInAsync();
                        break;
                    case "2":
                    case "logout":
                    case "signout":
                        await LogOutAsync();
                        break;
                    case "3":
                    case "cdir":
                    case "configdirectory":
                        await ConfigDirectoryAsync();
                        break;
                    case "4":
                    case "csync":
                    case "configsync":
                        await ConfigSyncAsync();
                        break;
                    case "5":
                    case "print":
                    case "sim":
                    case "simulate":
                        await PrintAsync();
                        break;
                    case "6":
                    case "sync":
                        await SyncAsync();
                        break;
                    case "7":
                    case "svc":
                    case "service":
                        await ServiceAsync();
                        break;
                    case "8":
                    case "environnment":
                    case "env":
                        await EnvironmentAsync();
                        break;
                    case "9":
                    case "exit":
                    case "quit":
                    case "q":
                        _exit = true;
                        break;
                    default:
                        Con.WriteLine("Unknown command.");
                        break;
                }

                if(_exit || _usingArgs)
                {
                    break;
                }
                else
                {
                    Con.WriteLine();
                    Con.WriteLine();
                }
            }

            _args = null;
        }

        private static async Task LogInAsync()
        {
            if(AuthService.Instance.Authenticated)
            {
                Con.WriteLine("You are already logged in as {0}.", TokenService.Instance.AccessTokenEmail);
                return;
            }

            string email = null;
            string masterPassword = null;
            string token = null;
            string orgId = null;

            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.Count >= 2 && parameters.ContainsKey("e") && parameters.ContainsKey("p"))
                {
                    email = parameters["e"];
                    masterPassword = parameters["p"];
                }
                if(parameters.Count >= 3 && parameters.ContainsKey("t"))
                {
                    token = parameters["t"];
                }
                if(parameters.Count >= 3 && parameters.ContainsKey("o"))
                {
                    orgId = parameters["o"];
                }
            }
            else
            {
                Con.Write("Email: ");
                email = Con.ReadLine().Trim();
                Con.Write("Master password: ");
                masterPassword = ReadSecureLine();
            }

            if(string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(masterPassword))
            {
                Con.WriteLine();
                Con.WriteLine();
                WriteErrorLine("Invalid input parameters.");
                return;
            }

            Con.WriteLine();
            Con.WriteLine("Logging in...");
            LoginResult result = null;
            if(string.IsNullOrWhiteSpace(token))
            {
                result = await AuthService.Instance.LogInAsync(email, masterPassword);
            }
            else
            {
                result = await AuthService.Instance.LogInTwoFactorAsync(email, masterPassword, token);
            }

            if(string.IsNullOrWhiteSpace(token) && result.TwoFactorRequired)
            {
                Con.WriteLine();
                Con.WriteLine();
                Con.WriteLine("Two-step login is enabled on this account. Please enter your verification code.");
                Con.Write("Verification code: ");
                token = Con.ReadLine().Trim();
                result = await AuthService.Instance.LogInTwoFactorWithHashAsync(token, email,
                    result.MasterPasswordHash);
            }

            if(result.Success && result.Organizations.Count > 1)
            {
                Organization org = null;
                if(!string.IsNullOrWhiteSpace(orgId))
                {
                    org = result.Organizations.FirstOrDefault(o => o.Id == orgId);
                }
                else
                {
                    Con.WriteLine();
                    Con.WriteLine();
                    for(int i = 0; i < result.Organizations.Count; i++)
                    {
                        Con.WriteLine("{0}. {1}", i + 1, result.Organizations[i].Name);
                    }
                    Con.WriteLine();
                    Con.Write("Select your organization: ");
                    var orgIndexInput = Con.ReadLine().Trim();
                    int orgIndex;
                    if(int.TryParse(orgIndexInput, out orgIndex) && result.Organizations.Count >= orgIndex)
                    {
                        org = result.Organizations[orgIndex - 1];
                    }
                }

                if(org == null)
                {
                    result.Success = false;
                    result.ErrorMessage = "Organization not found.";
                    AuthService.Instance.LogOut();
                }
                else
                {
                    SettingsService.Instance.Organization = org;
                }
            }

            Con.WriteLine();
            Con.WriteLine();
            if(result.Success)
            {
                WriteSuccessLine(string.Format("You have successfully logged in as {0}!",
                    TokenService.Instance.AccessTokenEmail));
            }
            else
            {
                WriteErrorLine(result.ErrorMessage);
            }

            masterPassword = null;
        }

        private static Task LogOutAsync()
        {
            if(AuthService.Instance.Authenticated)
            {
                AuthService.Instance.LogOut();
                WriteSuccessLine("You have successfully logged out!");
            }
            else
            {
                WriteErrorLine("You are not logged in.");
            }

            return Task.FromResult(0);
        }

        private static Task ConfigDirectoryAsync()
        {
            var config = SettingsService.Instance.Server ?? new ServerConfiguration();

            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.ContainsKey("t"))
                {
                    Core.Enums.DirectoryType dirType;
                    if(Enum.TryParse(parameters["t"], out dirType))
                    {
                        config.Type = dirType;
                    }
                    else
                    {
                        WriteErrorLine("Unable to parse type parameter.");
                        return Task.FromResult(0);
                    }
                }

                if(config.Type == Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    config.Azure = new AzureConfiguration();

                    if(parameters.ContainsKey("i"))
                    {
                        config.Azure.Id = parameters["i"];
                    }

                    if(parameters.ContainsKey("s"))
                    {
                        config.Azure.Secret = new EncryptedData(parameters["s"]);
                    }

                    if(parameters.ContainsKey("t"))
                    {
                        config.Azure.Tenant = parameters["t"];
                    }
                }
                else
                {
                    config.Ldap = config.Ldap ?? new LdapConfiguration();
                    if(parameters.ContainsKey("a"))
                    {
                        config.Ldap.Address = parameters["a"];
                    }

                    if(parameters.ContainsKey("port"))
                    {
                        config.Ldap.Port = parameters["port"];
                    }

                    if(parameters.ContainsKey("path"))
                    {
                        config.Ldap.Path = parameters["path"];
                    }

                    if(parameters.ContainsKey("cu"))
                    {
                        config.Ldap.Username = null;
                        config.Ldap.Password = null;
                    }
                    else
                    {
                        if(parameters.ContainsKey("u"))
                        {
                            config.Ldap.Username = parameters["u"];
                        }

                        if(parameters.ContainsKey("p"))
                        {
                            config.Ldap.Password = new EncryptedData(parameters["p"]);
                        }
                    }
                }
            }
            else
            {
                string input;

                Con.WriteLine("1. Active Directory");
                Con.WriteLine("2. Azure Active Directory ");
                Con.WriteLine("3. Other LDAP Directory");

                string currentType;
                switch(config.Type)
                {
                    case Core.Enums.DirectoryType.ActiveDirectory:
                        currentType = "1";
                        break;
                    case Core.Enums.DirectoryType.AzureActiveDirectory:
                        currentType = "2";
                        break;
                    default:
                        currentType = "3";
                        break;
                }
                Con.WriteLine();
                Con.Write("Type [{0}]: ", currentType);
                input = Con.ReadLine();
                if(!string.IsNullOrEmpty(input))
                {
                    switch(input)
                    {
                        case "1":
                            config.Type = Core.Enums.DirectoryType.ActiveDirectory;
                            break;
                        case "2":
                            config.Type = Core.Enums.DirectoryType.AzureActiveDirectory;
                            break;
                        default:
                            config.Type = Core.Enums.DirectoryType.Other;
                            break;
                    }
                }

                if(config.Type == Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    config.Azure = config.Azure ?? new AzureConfiguration();

                    Con.Write("Tenant [{0}]: ", config.Azure.Tenant);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Azure.Tenant = input.Trim();
                    }
                    Con.Write("Application Id [{0}]: ", config.Azure.Id);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Azure.Id = input.Trim();
                    }
                    Con.Write("Secret key: ");
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Azure.Secret = new EncryptedData(input.Trim());
                        input = null;
                    }
                }
                else
                {
                    config.Ldap = config.Ldap ?? new LdapConfiguration();

                    Con.Write("Address [{0}]: ", config.Ldap.Address);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.Address = input.Trim();
                    }
                    Con.Write("Port [{0}]: ", config.Ldap.Port);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.Port = input.Trim();
                    }
                    Con.Write("Path [{0}]: ", config.Ldap.Path);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.Path = input.Trim();
                    }

                    var currentUser = string.IsNullOrWhiteSpace(config.Ldap.Username) &&
                        config.Ldap.Password == null;
                    Con.Write("Authenticate as current user? [{0}]: ", currentUser ? "y" : "n");
                    input = Con.ReadLine().ToLower();
                    if(!string.IsNullOrEmpty(input))
                    {
                        currentUser = input == "y" || input == "yes";
                    }

                    if(currentUser)
                    {
                        config.Ldap.Username = null;
                        config.Ldap.Password = null;
                    }
                    else
                    {
                        Con.Write("Username [{0}]: ", config.Ldap.Username);
                        input = Con.ReadLine();
                        if(!string.IsNullOrEmpty(input))
                        {
                            config.Ldap.Username = input.Trim();
                        }
                        Con.Write("Password: ");
                        input = ReadSecureLine();
                        if(!string.IsNullOrEmpty(input))
                        {
                            config.Ldap.Password = new EncryptedData(input);
                            input = null;
                        }
                    }
                }

                input = null;
            }

            Con.WriteLine();
            Con.WriteLine();
            if(config.Ldap != null && string.IsNullOrWhiteSpace(config.Ldap.Address))
            {
                WriteErrorLine("Invalid input parameters.");
            }
            else if(config.Azure != null && (string.IsNullOrWhiteSpace(config.Azure.Id) ||
                config.Azure.Secret == null || string.IsNullOrWhiteSpace(config.Azure.Tenant)))
            {
                WriteErrorLine("Invalid input parameters.");
            }
            else
            {
                SettingsService.Instance.Server = config;
                WriteSuccessLine("Saved directory server configuration.");
            }

            return Task.FromResult(0);
        }

        private static Task ConfigSyncAsync()
        {
            var config = SettingsService.Instance.Sync ??
                new SyncConfiguration(SettingsService.Instance.Server.Type);

            if(_usingArgs)
            {
                var parameters = ParseParameters();

                config.SyncGroups = parameters.ContainsKey("g");
                config.SyncUsers = parameters.ContainsKey("u");

                int intervalMinutes;
                if(parameters.ContainsKey("i") && int.TryParse(parameters["i"], out intervalMinutes))
                {
                    config.IntervalMinutes = intervalMinutes;
                }

                if(parameters.ContainsKey("uf"))
                {
                    config.UserFilter = parameters["uf"];
                }
                if(parameters.ContainsKey("gf"))
                {
                    config.GroupFilter = parameters["gf"];
                }

                if(SettingsService.Instance.Server.Type != Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    if(parameters.ContainsKey("go"))
                    {
                        config.Ldap.GroupObjectClass = parameters["go"];
                    }
                    if(parameters.ContainsKey("gp"))
                    {
                        config.Ldap.GroupPath = parameters["gp"];
                    }
                    if(parameters.ContainsKey("gf"))
                    {
                        config.GroupFilter = parameters["gf"];
                    }
                    if(parameters.ContainsKey("gn"))
                    {
                        config.Ldap.GroupNameAttribute = parameters["gn"];
                    }

                    if(parameters.ContainsKey("uo"))
                    {
                        config.Ldap.UserObjectClass = parameters["uo"];
                    }
                    if(parameters.ContainsKey("up"))
                    {
                        config.Ldap.UserPath = parameters["up"];
                    }
                    if(parameters.ContainsKey("ue"))
                    {
                        config.Ldap.UserEmailAttribute = parameters["ue"];
                    }

                    if(parameters.ContainsKey("m"))
                    {
                        config.Ldap.MemberAttribute = parameters["m"];
                    }

                    config.Ldap.EmailPrefixSuffix = parameters.ContainsKey("ps");

                    if(parameters.ContainsKey("ep"))
                    {
                        config.Ldap.UserEmailPrefixAttribute = parameters["ep"];
                    }

                    if(parameters.ContainsKey("es"))
                    {
                        config.Ldap.UserEmailSuffix = parameters["es"];
                    }

                    if(parameters.ContainsKey("c"))
                    {
                        config.Ldap.CreationDateAttribute = parameters["c"];
                    }

                    if(parameters.ContainsKey("r"))
                    {
                        config.Ldap.RevisionDateAttribute = parameters["r"];
                    }
                }
            }
            else
            {
                string input;

                Con.Write("Sync groups? [{0}]: ", config.SyncGroups ? "y" : "n");
                input = Con.ReadLine().ToLower();
                if(!string.IsNullOrEmpty(input))
                {
                    config.SyncGroups = input == "y" || input == "yes";
                }
                if(config.SyncGroups &&
                    SettingsService.Instance.Server.Type != Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    Con.Write("Group path [{0}]: ", config.Ldap.GroupPath);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.GroupPath = input;
                    }
                    Con.Write("Group object class [{0}]: ", config.Ldap.GroupObjectClass);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.GroupObjectClass = input;
                    }
                    Con.Write("Group name attribute [{0}]: ", config.Ldap.GroupNameAttribute);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.GroupNameAttribute = input;
                    }
                }
                Con.Write("Group filter [{0}]: ", config.GroupFilter);
                input = Con.ReadLine();
                if(!string.IsNullOrEmpty(input))
                {
                    config.GroupFilter = input;
                }

                Con.Write("Sync users? [{0}]: ", config.SyncUsers ? "y" : "n");
                input = Con.ReadLine().ToLower();
                if(!string.IsNullOrEmpty(input))
                {
                    config.SyncUsers = input == "y" || input == "yes";
                }
                if(config.SyncUsers &&
                    SettingsService.Instance.Server.Type != Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    Con.Write("User path [{0}]: ", config.Ldap.UserPath);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.UserPath = input;
                    }
                    Con.Write("User object class [{0}]: ", config.Ldap.UserObjectClass);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.UserObjectClass = input;
                    }
                    Con.Write("User email attribute [{0}]: ", config.Ldap.UserEmailAttribute);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.GroupNameAttribute = input;
                    }
                }
                Con.Write("User filter [{0}]: ", config.UserFilter);
                input = Con.ReadLine();
                if(!string.IsNullOrEmpty(input))
                {
                    config.UserFilter = input;
                }

                if(SettingsService.Instance.Server.Type != Core.Enums.DirectoryType.AzureActiveDirectory)
                {
                    Con.Write("Member Attribute [{0}]: ", config.Ldap.MemberAttribute);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.MemberAttribute = input;
                    }
                    Con.Write("Creation Attribute [{0}]: ", config.Ldap.CreationDateAttribute);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.CreationDateAttribute = input;
                    }
                    Con.Write("Changed Attribute [{0}]: ", config.Ldap.RevisionDateAttribute);
                    input = Con.ReadLine();
                    if(!string.IsNullOrEmpty(input))
                    {
                        config.Ldap.RevisionDateAttribute = input;
                    }
                }

                Con.Write("Sync interval (minutes, minimum {1}) [{0}]: ", config.IntervalMinutes,
                    SettingsService.Instance.Server.Type == Core.Enums.DirectoryType.Other ? "30" : "1");
                input = Con.ReadLine();
                int intervalMinutes;
                if(!string.IsNullOrEmpty(input) && int.TryParse(input, out intervalMinutes))
                {
                    config.IntervalMinutes = intervalMinutes;
                }

                input = null;
            }

            Con.WriteLine();
            Con.WriteLine();
            SettingsService.Instance.Sync = config;
            WriteSuccessLine("Saved sync configuration.");

            return Task.FromResult(0);
        }

        private static async Task SyncAsync()
        {
            if(!AuthService.Instance.Authenticated)
            {
                Con.WriteLine("You are not logged in.");
            }
            else if(SettingsService.Instance.Server == null)
            {
                Con.WriteLine("Server is not configured.");
            }
            else
            {
                var force = false;
                if(_usingArgs)
                {
                    var parameters = ParseParameters();
                    force = parameters.ContainsKey("f");
                }

                Con.WriteLine("Syncing...");
                var result = await Sync.SyncAllAsync(force, true);

                if(result.Success)
                {
                    WriteSuccessLine(string.Format("Syncing complete ({0} users, {1} groups).", 
                        result.Users.Count, result.Groups.Count));
                }
                else
                {
                    WriteErrorLine("Syncing failed.\n" + result.ErrorMessage);
                }
            }
        }

        private static async Task PrintAsync()
        {
            if(!AuthService.Instance.Authenticated)
            {
                Con.WriteLine("You are not logged in.");
            }
            else if(SettingsService.Instance.Server == null)
            {
                Con.WriteLine("Server is not configured.");
            }
            else
            {
                var force = false;
                if(_usingArgs)
                {
                    var parameters = ParseParameters();
                    force = parameters.ContainsKey("f");
                }

                Con.WriteLine("Querying...");
                Con.WriteLine();

                var result = await Sync.SyncAllAsync(force, false);
                if(result.Success)
                {
                    Con.WriteLine("Groups:");
                    foreach(var group in result.Groups)
                    {
                        Con.WriteLine("  {0} - {1}", group.Name, group.ExternalId);
                        foreach(var user in group.UserMemberExternalIds)
                        {
                            Con.WriteLine("    {0}", user);
                        }
                    }

                    Con.WriteLine();
                    Con.WriteLine("Users:");
                    foreach(var user in result.Users)
                    {
                        Con.WriteLine("  {0}{1}{2}", user.Email ?? user.ExternalId,
                            user.Disabled ? " (-)" : null, user.Deleted ? " (X)" : null);
                    }
                }
                else
                {
                    WriteErrorLine("Querying failed.\n" + result.ErrorMessage);
                }
            }
        }

        private static Task ServiceAsync()
        {
            try
            {
                Con.WriteLine("Service current status: {0}", ControllerService.Instance.StatusString);
                Con.WriteLine();
            }
            catch
            {
                Con.WriteLine("Service unavailable.");
                return Task.FromResult(0);
            }

            var start = false;
            var stop = false;
            var status = false;
            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.ContainsKey("start"))
                {
                    start = true;
                }
                else if(parameters.ContainsKey("stop"))
                {
                    stop = true;
                }
            }
            else
            {
                Con.WriteLine("1. Start service");
                Con.WriteLine("2. Stop service");
                Con.WriteLine("3. Check service status");
                Con.WriteLine("4. Nothing, go back");
                Con.WriteLine();
                Con.Write("Option: ");
                var selection = Con.ReadLine();

                switch(selection)
                {
                    case "1":
                    case "start":
                        start = true;
                        break;
                    case "2":
                    case "stop":
                        stop = true;
                        break;
                    case "3":
                    case "status":
                        status = true;
                        break;
                    default:
                        break;
                }
            }

            Con.WriteLine();

            if((start || stop) && !Helpers.IsAdministrator())
            {
                WriteErrorLine("You must be an administrator to control the service.");
                return Task.FromResult(0);
            }

            if(start)
            {
                Con.WriteLine("Starting service...");
                ControllerService.Instance.Start();
            }
            else if(stop)
            {
                Con.WriteLine("Stopping service...");
                ControllerService.Instance.Stop();
            }
            else if(status)
            {
                Con.WriteLine("Status: {0}", ControllerService.Instance.StatusString);
            }

            return Task.FromResult(0);
        }

        private static Task EnvironmentAsync()
        {
            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.ContainsKey("debug"))
                {
                    SettingsService.Instance.ApiBaseUrl = "http://localhost:4000";
                    SettingsService.Instance.IdentityBaseUrl = "http://localhost:33656";
                }
                else
                {
                    if(parameters.ContainsKey("api"))
                    {
                        SettingsService.Instance.ApiBaseUrl = parameters["api"];
                    }
                    if(parameters.ContainsKey("id"))
                    {
                        SettingsService.Instance.IdentityBaseUrl = parameters["id"];
                    }
                }
            }
            else
            {
                var input = string.Empty;

                Con.Write("API [{0}]: ", SettingsService.Instance.ApiBaseUrl);
                input = Con.ReadLine();
                if(input == "debug")
                {
                    SettingsService.Instance.ApiBaseUrl = "http://localhost:4000";
                }
                else if(!string.IsNullOrEmpty(input))
                {
                    SettingsService.Instance.ApiBaseUrl = input;
                }
                Con.Write("Identity [{0}]: ", SettingsService.Instance.IdentityBaseUrl);
                input = Con.ReadLine();
                if(input == "debug")
                {
                    SettingsService.Instance.IdentityBaseUrl = "http://localhost:33656";
                }
                else if(!string.IsNullOrEmpty(input))
                {
                    SettingsService.Instance.IdentityBaseUrl = input;
                }
            }

            return Task.FromResult(0);
        }

        private static string ReadSecureLine()
        {
            var input = string.Empty;
            while(true)
            {
                var i = Con.ReadKey(true);
                if(i.Key == ConsoleKey.Enter)
                {
                    break;
                }
                else if(i.Key == ConsoleKey.Backspace)
                {
                    if(input.Length > 0)
                    {
                        input = input.Remove(input.Length - 1);
                        Con.Write("\b \b");
                    }
                }
                else
                {
                    input = string.Concat(input, i.KeyChar);
                    Con.Write("*");
                }
            }
            return input;
        }

        private static IDictionary<string, string> ParseParameters()
        {
            var dict = new Dictionary<string, string>();
            for(int i = 1; i < _args.Length; i = i + 2)
            {
                if(!_args[i].StartsWith("-"))
                {
                    continue;
                }

                dict.Add(_args[i].Substring(1), _args[i + 1]);
            }

            return dict;
        }

        private static void WriteErrorLine(string message)
        {
            Con.ForegroundColor = ConsoleColor.Red;
            Con.WriteLine(message);
            Con.ResetColor();
        }

        private static void WriteSuccessLine(string message)
        {
            Con.ForegroundColor = ConsoleColor.Green;
            Con.WriteLine(message);
            Con.ResetColor();
        }
    }
}
