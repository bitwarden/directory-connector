using System;
using System.ComponentModel;
using System.ServiceProcess;
using System.Configuration.Install;
using System.Diagnostics;
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;
using Bit.Core.Utilities;

namespace Service
{
    [RunInstaller(true)]
    [DesignerCategory("Code")]
    public class Installer : System.Configuration.Install.Installer
    {
        private IContainer _components = null;
        private ServiceProcessInstaller _serviceProcessInstaller;
        private ServiceInstaller _serviceInstaller;

        public Installer()
        {
            Init();
        }

        private void Init()
        {
            _components = new Container();
            _serviceProcessInstaller = new ServiceProcessInstaller();
            _serviceInstaller = new ServiceInstaller();

            _serviceProcessInstaller.Account = ServiceAccount.LocalSystem;
            _serviceProcessInstaller.AfterInstall += new InstallEventHandler(AfterInstalled);
            _serviceProcessInstaller.BeforeInstall += new InstallEventHandler(BeforeInstalled);

            _serviceInstaller.ServiceName = Constants.ProgramName;
            _serviceInstaller.Description = "Sync directory groups and users to your bitwarden organization.";
            Installers.AddRange(new System.Configuration.Install.Installer[] { _serviceProcessInstaller, _serviceInstaller });
        }

        private void AfterInstalled(object sender, InstallEventArgs e)
        {
            var info = new DirectoryInfo(Constants.BaseStoragePath);
            if(!info.Exists)
            {
                info.Create();
            }

            var sec = info.GetAccessControl();

            var adminRule = new FileSystemAccessRule(
                new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
                FileSystemRights.FullControl | FileSystemRights.Write | FileSystemRights.Read,
                InheritanceFlags.None,
                PropagationFlags.NoPropagateInherit,
                AccessControlType.Allow);
            sec.AddAccessRule(adminRule);

            var usersRule = new FileSystemAccessRule(
                new SecurityIdentifier(WellKnownSidType.BuiltinUsersSid, null),
                FileSystemRights.FullControl | FileSystemRights.Write | FileSystemRights.Read,
                InheritanceFlags.None,
                PropagationFlags.NoPropagateInherit,
                AccessControlType.Allow);
            sec.AddAccessRule(usersRule);

            sec.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
            info.SetAccessControl(sec);
        }

        private void BeforeInstalled(object sender, InstallEventArgs e)
        {
            if(EventLog.SourceExists(_serviceInstaller.ServiceName))
            {
                EventLog.DeleteEventSource(_serviceInstaller.ServiceName);
            }
        }
    }
}
