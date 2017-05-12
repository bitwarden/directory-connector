using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core
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

        public bool Authenticated { get; set; }
    }
}
