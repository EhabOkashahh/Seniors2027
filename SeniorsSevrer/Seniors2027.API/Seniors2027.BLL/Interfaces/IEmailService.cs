using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Seniors2027.BLL.Interfaces
{
    public interface IEmailService
    {
        public Task SendOtpEmailAsync(string toEmail, string otp);
    }
}