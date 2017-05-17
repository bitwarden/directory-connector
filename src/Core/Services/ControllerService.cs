using Bit.Core.Enums;
using Bit.Core.Models;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Services
{
    public class ControllerService
    {
        private static ControllerService _instance;

        private ControllerService()
        {
            Controller = new ServiceController(Constants.ProgramName);
        }

        public static ControllerService Instance
        {
            get
            {
                if(_instance == null)
                {
                    _instance = new ControllerService();
                }

                return _instance;
            }
        }

        public ServiceController Controller { get; private set; }
        public ServiceControllerStatus Status
        {
            get
            {
                Controller.Refresh();
                return Controller.Status;
            }
        }
        public string StatusString => Controller == null ? "Unavailable" : Status.ToString();
        public bool Running => Status == ServiceControllerStatus.Running;
        public bool Paused => Status == ServiceControllerStatus.Paused;
        public bool Stopped => Status == ServiceControllerStatus.Stopped;
        public bool Pending =>
            Status == ServiceControllerStatus.ContinuePending ||
            Status == ServiceControllerStatus.PausePending ||
            Status == ServiceControllerStatus.StartPending ||
            Status == ServiceControllerStatus.StopPending;

        public bool Start()
        {
            if(Controller == null || !Stopped)
            {
                return false;
            }

            Controller.Start();
            return true;
        }

        public bool Stop()
        {
            if(Controller == null || !Controller.CanStop)
            {
                return false;
            }

            Controller.Stop();
            return true;
        }
    }
}
