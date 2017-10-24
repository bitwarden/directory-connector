using Bit.Core.Utilities;
#if NET461
using System.ServiceProcess;
#endif

namespace Bit.Core.Services
{
    public class ControllerService
    {
        private static ControllerService _instance;

        private ControllerService()
        {
#if NET461
            Controller = new ServiceController(Constants.ProgramName);
#endif
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

#if NET461
        public ServiceController Controller { get; private set; }
        public ServiceControllerStatus Status
        {
            get
            {
                Controller.Refresh();
                return Controller.Status;
            }
        }
        public bool Running => Status == ServiceControllerStatus.Running;
        public bool Paused => Status == ServiceControllerStatus.Paused;
        public bool Stopped => Status == ServiceControllerStatus.Stopped;
        public bool Pending =>
            Status == ServiceControllerStatus.ContinuePending ||
            Status == ServiceControllerStatus.PausePending ||
            Status == ServiceControllerStatus.StartPending ||
            Status == ServiceControllerStatus.StopPending;
#endif
        public string StatusString
        {
            get
            {
#if NET461
                return Controller == null ? "Unavailable" : Status.ToString();
#else
                return "Unavailable";
#endif
            }
        }


        public bool Start()
        {
#if NET461
            if(Controller == null || !Stopped)
            {
                return false;
            }

            Controller.Start();
            return true;
#else
            throw new System.Exception("Controller unavailable.");
#endif
        }

        public bool Stop()
        {
#if NET461
            if(Controller == null || !Controller.CanStop)
            {
                return false;
            }

            Controller.Stop();

            return true;
#else
            throw new System.Exception("Controller unavailable.");
#endif
        }
    }
}
