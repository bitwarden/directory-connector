using System;
using System.Collections.Specialized;
#if NET461
using System.DirectoryServices;
#endif
using System.Globalization;

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

#if NET461
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
#endif

        public static NameValueCollection ParseQueryString(this Uri uri)
        {
            var queryParameters = new NameValueCollection();
            var querySegments = uri.Query.Split('&');
            foreach(var segment in querySegments)
            {
                var parts = segment.Split('=');
                if(parts.Length > 0)
                {
                    var key = parts[0].Trim(new char[] { '?', ' ' });
                    var val = parts[1].Trim();
                    queryParameters.Add(key, val);
                }
            }

            return queryParameters;
        }

        public static string FromGuidToString(this object property)
        {
            var propBytes = property as byte[];
            if(propBytes != null)
            {
                return new Guid(propBytes).ToString();
            }
            else
            {
                return property.ToString();
            }
        }
    }
}
