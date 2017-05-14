using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Bit.Core.Utilities
{
    public static class Extensions
    {
        private const string GeneralizedTimeFormat = "yyyyMMddHHmmss.f'Z'";

        public static DateTime ToDateTime(this string generalizedTimeString)
        {
            return DateTime.ParseExact(generalizedTimeString, GeneralizedTimeFormat, CultureInfo.InvariantCulture);
        }

        public static string ToGeneralizedTimeUTC(this DateTime date)
        {
            return date.ToString("yyyyMMddHHmmss.f'Z'");
        }
    }
}
