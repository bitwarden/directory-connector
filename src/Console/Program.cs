using Bit.Core.Models;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
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
                    Con.WriteLine("4. Sync directory");
                    Con.WriteLine("5. Start/stop background service");
                    Con.WriteLine("6. Exit");
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
                    case "dir":
                    case "directory":
                        await DirectoryAsync();
                        break;
                    case "4":
                    case "sync":
                        await SyncAsync();
                        break;
                    case "svc":
                    case "service":

                        break;
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
            if(Core.Services.AuthService.Instance.Authenticated)
            {
                Con.WriteLine("You are already logged in as {0}.", Core.Services.TokenService.Instance.AccessTokenEmail);
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
                Con.ForegroundColor = ConsoleColor.Red;
                Con.WriteLine("Invalid input parameters.");
                Con.ResetColor();
                return;
            }

            LoginResult result = null;
            if(string.IsNullOrWhiteSpace(token))
            {
                result = await Core.Services.AuthService.Instance.LogInAsync(email, masterPassword);
            }
            else
            {
                result = await Core.Services.AuthService.Instance.LogInTwoFactorAsync(email, masterPassword, token);
            }

            if(string.IsNullOrWhiteSpace(token) && result.TwoFactorRequired)
            {
                Con.WriteLine();
                Con.WriteLine();
                Con.WriteLine("Two-step login is enabled on this account. Please enter your verification code.");
                Con.Write("Verification code: ");
                token = Con.ReadLine().Trim();
                result = await Core.Services.AuthService.Instance.LogInTwoFactorWithHashAsync(token, email, 
                    result.MasterPasswordHash);
            }

            if(result.Success && result.Organizations.Count > 1)
            {
                Organization org = null;
                if(string.IsNullOrWhiteSpace(orgId))
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
                    Con.Write("Select your organization: ");
                    var orgIndexInput = Con.ReadLine().Trim();
                    int orgIndex;
                    if(int.TryParse(orgIndexInput, out orgIndex))
                    {
                        org = result.Organizations[orgIndex];
                    }
                }

                if(org == null)
                {
                    result.Success = false;
                    result.ErrorMessage = "Organization not found.";
                    Core.Services.AuthService.Instance.LogOut();
                }
                else
                {
                    Core.Services.SettingsService.Instance.Organization = org;
                }
            }

            Con.WriteLine();
            Con.WriteLine();
            if(result.Success)
            {
                Con.ForegroundColor = ConsoleColor.Green;
                Con.WriteLine("You have successfully logged in as {0}!", Core.Services.TokenService.Instance.AccessTokenEmail);
                Con.ResetColor();
            }
            else
            {
                Con.ForegroundColor = ConsoleColor.Red;
                Con.WriteLine(result.ErrorMessage);
                Con.ResetColor();
            }

            masterPassword = null;
        }

        private static Task LogOutAsync()
        {
            if(Core.Services.AuthService.Instance.Authenticated)
            {
                Core.Services.AuthService.Instance.LogOut();
                Con.ForegroundColor = ConsoleColor.Green;
                Con.WriteLine("You have successfully logged out!");
                Con.ResetColor();
            }
            else
            {
                Con.WriteLine("You are not logged in.");
            }

            return Task.FromResult(0);
        }

        private static Task DirectoryAsync()
        {
            var config = new ServerConfiguration();

            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.ContainsKey("a"))
                {
                    config.Address = parameters["a"];
                }

                if(parameters.ContainsKey("port"))
                {
                    config.Port = parameters["port"];
                }

                if(parameters.ContainsKey("path"))
                {
                    config.Path = parameters["path"];
                }

                if(parameters.ContainsKey("u"))
                {
                    config.Username = parameters["u"];
                }

                if(parameters.ContainsKey("p"))
                {
                    config.Password = new EncryptedData(parameters["p"]);
                }

                if(parameters.ContainsKey("gf"))
                {
                    config.GroupFilter = parameters["gf"];
                }

                if(parameters.ContainsKey("uf"))
                {
                    config.UserFilter = parameters["uf"];
                }
            }
            else
            {
                string input;

                Con.Write("Address: ");
                config.Address = Con.ReadLine().Trim();
                Con.Write("Port [{0}]: ", config.Port);
                input = Con.ReadLine().Trim();
                if(!string.IsNullOrWhiteSpace(input))
                {
                    config.Port = input;
                }
                Con.Write("Path: ");
                config.Path = Con.ReadLine().Trim();
                Con.Write("Username: ");
                config.Username = Con.ReadLine().Trim();
                Con.Write("Password: ");
                input = ReadSecureLine();
                if(!string.IsNullOrWhiteSpace(input))
                {
                    config.Password = new EncryptedData(input);
                    input = null;
                }
                Con.WriteLine();
                Con.Write("Sync groups? [y]: ");
                input = Con.ReadLine().Trim().ToLower();
                config.SyncGroups = input == "y" || input == "yes" || string.IsNullOrWhiteSpace(input);
                if(config.SyncGroups)
                {
                    Con.Write("Group filter [{0}]: ", config.GroupFilter);
                    input = Con.ReadLine().Trim();
                    if(!string.IsNullOrWhiteSpace(input))
                    {
                        config.GroupFilter = input;
                    }
                    Con.Write("Group name attribute [{0}]: ", config.GroupNameAttribute);
                    input = Con.ReadLine().Trim();
                    if(!string.IsNullOrWhiteSpace(input))
                    {
                        config.GroupNameAttribute = input;
                    }
                }
                Con.Write("Sync users? [y]: ");
                input = Con.ReadLine().Trim().ToLower();
                config.SyncUsers = input == "y" || input == "yes" || string.IsNullOrWhiteSpace(input);
                if(config.SyncUsers)
                {
                    Con.Write("User filter [{0}]: ", config.UserFilter);
                    input = Con.ReadLine().Trim();
                    if(!string.IsNullOrWhiteSpace(input))
                    {
                        config.UserFilter = input;
                    }
                    Con.Write("User email attribute [{0}]: ", config.UserEmailAttribute);
                    input = Con.ReadLine().Trim();
                    if(!string.IsNullOrWhiteSpace(input))
                    {
                        config.GroupNameAttribute = input;
                    }
                }

                input = null;
            }

            Con.WriteLine();
            Con.WriteLine();
            if(string.IsNullOrWhiteSpace(config.Address))
            {
                Con.ForegroundColor = ConsoleColor.Red;
                Con.WriteLine("Invalid input parameters.");
                Con.ResetColor();
            }
            else
            {
                Core.Services.SettingsService.Instance.Server = config;
                Con.ForegroundColor = ConsoleColor.Green;
                Con.WriteLine("Saved directory server configuration.");
                Con.ResetColor();
            }

            return Task.FromResult(0);
        }

        private static async Task SyncAsync()
        {
            if(!Core.Services.AuthService.Instance.Authenticated)
            {
                Con.WriteLine("You are not logged in.");
            }
            else if(Core.Services.SettingsService.Instance.Server == null)
            {
                Con.WriteLine("Server is not configured.");
            }
            else
            {
                Con.WriteLine("Syncing...");
                await Sync.SyncAllAsync();
                Con.ForegroundColor = ConsoleColor.Green;
                Con.WriteLine("Syncing complete.");
                Con.ResetColor();
            }
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
    }
}
