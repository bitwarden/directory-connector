using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;

namespace Service
{
    static class Program
    {
        static void Main()
        {
            DebugMode();

            ServiceBase.Run(new ServiceBase[]
            {
                new Service()
            });
        }

        [Conditional("DEBUG")]
        private static void DebugMode()
        {
            Debugger.Launch();
        }
    }
}
