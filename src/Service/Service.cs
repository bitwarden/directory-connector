using Bit.Core.Services;
using Bit.Core.Utilities;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading;

namespace Service
{
    [DesignerCategory("Code")]
    public class Service : ServiceBase
    {
        private IContainer _components;
        private EventLog _eventLog;
        private Timer _timer;

        public Service()
        {
            ServiceName = Constants.ProgramName;

            _components = new Container();

            _eventLog = new EventLog();
            _eventLog.Source = ServiceName;
            _eventLog.Log = "Application";

            if(!EventLog.SourceExists(_eventLog.Source))
            {
                EventLog.CreateEventSource(_eventLog.Source, _eventLog.Log);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if(disposing)
            {
                _eventLog?.Dispose();
                _eventLog = null;

                _components?.Dispose();
                _components = null;

                _timer?.Dispose();
                _timer = null;
            }

            base.Dispose(disposing);
        }

        protected override void OnStart(string[] args)
        {
            _eventLog.WriteEntry("Service started!", EventLogEntryType.Information);

            if(SettingsService.Instance.Server == null)
            {
                _eventLog.WriteEntry("Server not configured.", EventLogEntryType.Error);
                return;
            }

            if(SettingsService.Instance.Sync == null)
            {
                _eventLog.WriteEntry("Sync not configured.", EventLogEntryType.Error);
                return;
            }

            if(!AuthService.Instance.Authenticated || !AuthService.Instance.OrganizationSet)
            {
                _eventLog.WriteEntry("Not authenticated with proper organization set.", EventLogEntryType.Error);
                return;
            }

            var intervalMinutes = SettingsService.Instance.Sync.IntervalMinutes;
            if(SettingsService.Instance.Server.Type == Bit.Core.Enums.DirectoryType.Other && intervalMinutes < 60)
            {
                intervalMinutes = 60;
            }
            else if(intervalMinutes < 1)
            {
                intervalMinutes = 1;
            }

            _eventLog.WriteEntry($"Starting timer with {intervalMinutes} minute interval.", EventLogEntryType.Information);
            var timerDelegate = new TimerCallback(Callback);
            _timer = new Timer(timerDelegate, null, 1000, 60 * 1000 * intervalMinutes);
        }

        protected override void OnStop()
        {
            _eventLog.WriteEntry("Service stopped!", EventLogEntryType.Information);
        }

        private void Callback(object stateInfo)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var result = Sync.SyncAllAsync(false, true).GetAwaiter().GetResult();
                sw.Stop();
                if(result.Success)
                {
                    _eventLog.WriteEntry($"Synced {result.Groups.Count} groups, {result.Users.Count} users. " +
                        $"The sync took {(int)sw.Elapsed.TotalSeconds} seconds to complete.",
                        EventLogEntryType.SuccessAudit);
                }
                else
                {
                    _eventLog.WriteEntry($"Sync failed after {(int)sw.Elapsed.TotalSeconds} seconds: {result.ErrorMessage}.",
                        EventLogEntryType.FailureAudit);
                }
            }
            catch(ApplicationException e)
            {
                _eventLog.WriteEntry($"Sync exception: {e.Message}", EventLogEntryType.Error);
            }
        }
    }
}
