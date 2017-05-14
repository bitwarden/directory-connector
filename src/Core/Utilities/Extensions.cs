using System;
using System.Collections.Generic;
using System.DirectoryServices;
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

        public static DateTime? ParseDateTime(this ResultPropertyCollection collection, string dateKey)
        {
            DateTime date;
            if(collection.Contains(dateKey) && collection[dateKey].Count > 0 &&
                DateTime.TryParse(collection[dateKey][0].ToString(), out date))
            {
                return date;
            }

            return null;
        }
    }
}
