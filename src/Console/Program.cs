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
            _args = args;
            _usingArgs = args.Length > 0;
            string selection = null;

            while(true)
            {
                if(_usingArgs)
                {
                    selection = args[0];
                }
                else
                {
                    Con.WriteLine("Main Menu");
                    Con.WriteLine("=================================");
                    Con.WriteLine("1. Log in to bitwarden");
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
                        LogIn();
                        break;
                    case "2":
                    case "dir":

                        break;
                    case "3":
                    case "sync":

                        break;
                    case "4":
                    case "svc":

                        break;
                    case "5":
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

        public static void LogIn()
        {
            string email = null;
            SecureString masterPassword = null;

            if(_usingArgs)
            {
                email = _args[1];
                masterPassword = new SecureString();
                foreach(var c in _args[2])
                {
                    masterPassword.AppendChar(c);
                }
            }
            else
            {
                Con.Write("Email: ");
                email = Con.ReadLine();
                Con.Write("Master password: ");
                masterPassword = ReadSecureLine();
            }

            // TODO: Do login
        }

        public static SecureString ReadSecureLine()
        {
            var input = new SecureString();
            while(true)
            {
                ConsoleKeyInfo i = Con.ReadKey(true);
                if(i.Key == ConsoleKey.Enter)
                {
                    break;
                }
                else if(i.Key == ConsoleKey.Backspace)
                {
                    if(input.Length > 0)
                    {
                        input.RemoveAt(input.Length - 1);
                        Con.Write("\b \b");
                    }
                }
                else
                {
                    input.AppendChar(i.KeyChar);
                    Con.Write("*");
                }
            }
            return input;
        }
    }
}
