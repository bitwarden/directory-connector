using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;

namespace Service
{
    [DesignerCategory("Code")]
    public class Service : ServiceBase
    {
        private IContainer _components;
        private EventLog _eventLog;

        public Service()
        {
            ServiceName = "bitwarden Directory Connector";

            _components = new Container();

            _eventLog = new EventLog();
            _eventLog.Source = ServiceName;
            _eventLog.Log = "bitwarden";

            var eventLogSupprot = _eventLog as ISupportInitialize;
            eventLogSupprot.BeginInit();
            if(!EventLog.SourceExists(_eventLog.Source))
            {
                EventLog.CreateEventSource(ServiceName, _eventLog.Log);
            }
            eventLogSupprot.EndInit();
        }

        protected override void Dispose(bool disposing)
        {
            if(disposing)
            {
                _eventLog?.Dispose();
                _eventLog = null;

                _components?.Dispose();
                _components = null;
            }

            base.Dispose(disposing);
        }

        protected override void OnStart(string[] args)
        {
            _eventLog.WriteEntry("Service started!", EventLogEntryType.Information);
        }

        protected override void OnStop()
        {
            _eventLog.WriteEntry("Service stopped!", EventLogEntryType.Information);
        }
    }
}
