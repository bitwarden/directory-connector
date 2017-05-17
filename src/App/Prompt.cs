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
    public partial class Prompt : Form
    {
        public string ReturnValue { get; set; }

        public Prompt(string title, string label, string buttonText)
        {
            InitializeComponent();
            Text = title;
            label1.Text = label;
            button1.Text = buttonText;
        }

        private void button1_Click(object sender, EventArgs e)
        {
            ReturnValue = textBox1.Text;
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
