using Bit.Core.Models;
using Bit.Core.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace App
{
    public partial class Main : Form
    {
        public Main()
        {
            InitializeComponent();
        }

        private void Main_Load(object sender, EventArgs e)
        {

        }

        private async void loginButton_Click(object sender, EventArgs e)
        {
            var result = await AuthService.Instance.LogInAsync(usernameTextBox.Text, passwordTextBox.Text);

            if(result.TwoFactorRequired)
            {
                string token = null;
                using(var prompt = new Prompt("Verification Code", "Enter your two-step verification code", "Submit"))
                {
                    var promptResult = prompt.ShowDialog();
                    if(promptResult == DialogResult.OK)
                    {
                        token = prompt.ReturnValue;
                    }
                }

                result = await AuthService.Instance.LogInTwoFactorWithHashAsync(token, usernameTextBox.Text,
                    result.MasterPasswordHash);
            }

            if(result.Success && result.Organizations.Count > 1)
            {
                Organization org = null;

                var orgs = new Dictionary<string, string>();
                for(int i = 0; i < result.Organizations.Count; i++)
                {
                    orgs.Add(result.Organizations[i].Id, result.Organizations[i].Name);
                }

                // TODO: alert about org

                if(org == null)
                {
                    result.Success = false;
                    result.ErrorMessage = "Organization not found.";
                    AuthService.Instance.LogOut();
                }
                else
                {
                    SettingsService.Instance.Organization = org;
                }
            }

            if(result.Success)
            {

            }
            else
            {
                using(var prompt = new Alert("Error", result.ErrorMessage))
                {
                    var promptResult = prompt.ShowDialog();
                }
            }

            passwordTextBox.Text = null;
        }
    }
}
