using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using System.Configuration.Install;

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

            _serviceInstaller.ServiceName = "bitwarden Directory Connector";
            Installers.AddRange(new System.Configuration.Install.Installer[] { _serviceProcessInstaller, _serviceInstaller });
        }

        private void AfterInstalled(object sender, InstallEventArgs e)
        {

        }
    }
}
