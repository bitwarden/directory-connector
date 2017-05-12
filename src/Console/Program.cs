using Bit.Core.Models;
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
                    Con.WriteLine("2. Configure directory connection");
                    Con.WriteLine("3. Sync directory");
                    Con.WriteLine("4. Start/stop background service");
                    Con.WriteLine("5. Exit");
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
                    case "dir":
                    case "directory":
                        await DirectoryAsync();
                        break;
                    case "sync":

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

            if(_usingArgs)
            {
                var parameters = ParseParameters();
                if(parameters.Count >= 2 && parameters.ContainsKey("e") && parameters.ContainsKey("p"))
                {
                    email = parameters["e"];
                    masterPassword = parameters["p"];
                }
                if(parameters.Count == 3 && parameters.ContainsKey("t"))
                {
                    token = parameters["t"];
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
                result = await Core.Services.AuthService.Instance.LogInTwoFactorAsync(token, email, result.MasterPasswordHash);
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
                Con.WriteLine("You have successfully logged out!");
            }
            else
            {
                Con.WriteLine("You are not logged in.");
            }

            return Task.FromResult(0);
        }

        private static async Task DirectoryAsync()
        {
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
