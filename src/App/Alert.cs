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
    public partial class Alert : Form
    {
        public bool ButtonClicked { get; set; }

        public Alert(string title, string label, string buttonText = "Ok")
        {
            InitializeComponent();

            Text = title;
            label1.Text = label;
            button1.Text = buttonText;
        }

        private void button1_Click(object sender, EventArgs e)
        {
            ButtonClicked = true;
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
