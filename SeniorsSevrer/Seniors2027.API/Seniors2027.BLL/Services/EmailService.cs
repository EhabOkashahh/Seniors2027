using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;
using MimeKit;
using Seniors2027.BLL.Interfaces;

namespace Seniors2027.BLL.Services
{
    public class EmailService(IConfiguration _config) : IEmailService
    {
        public async Task SendOtpEmailAsync(string toEmail, string otp)
        {
            try
            {
                var message = new MimeMessage();

                message.From.Add(new MailboxAddress(
                    "School OTP System",
                    _config["EmailSetting:FromEmail"]
                ));

                message.To.Add(MailboxAddress.Parse(toEmail));

                message.Subject = "Your OTP Verification Code";

                message.Body = new TextPart("html")
                {
                    Text = $@"
                    <div style='margin:0;padding:24px 12px;background:#f8f2df;font-family:Arial,sans-serif;color:#101010;'>
                      <div style='max-width:620px;margin:0 auto;background:#fffdf6;border:4px solid #101010;border-radius:14px;box-shadow:10px 10px 0 #101010;overflow:hidden;'>
                        <div style='padding:20px 20px 8px 20px;text-align:center;'>
                          <div style='display:inline-block;padding:10px 18px;background:#ffd84d;border:3px solid #101010;border-radius:10px;box-shadow:6px 6px 0 #101010;font-weight:900;letter-spacing:1px;font-size:24px;text-transform:uppercase;'>
                            Seniors 2027
                          </div>
                        </div>
                        <div style='padding:10px 20px 22px 20px;'>
                          <div style='background:#ffd84d;border:3px solid #101010;border-radius:10px;box-shadow:6px 6px 0 #101010;padding:10px 12px;text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:1px;font-size:12px;'>
                            OTP Verification
                          </div>
                          <p style='margin:18px 0 8px 0;font-size:18px;font-weight:700;'>Welcome back, Senior.</p>
                          <p style='margin:0 0 14px 0;font-size:15px;line-height:1.6;'>Use this one-time password to continue your login:</p>
                          <div style='background:#b9f282;border:4px solid #101010;border-radius:12px;box-shadow:8px 8px 0 #101010;padding:14px 10px;text-align:center;font-family:Consolas,Monaco,monospace;font-size:36px;letter-spacing:8px;font-weight:900;'>
                            {otp}
                          </div>
                          <p style='margin:14px 0 0 0;font-size:14px;'>This code expires in <strong>5 minutes</strong>.</p>
                          <p style='margin:8px 0 0 0;font-size:13px;opacity:0.85;'>If this was not you, ignore this email.</p>
                        </div>
                      </div>
                    </div>
                "
                };

                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(
                _config["EmailSetting:SmtpHost"],
                int.Parse(_config["EmailSetting:SmtpPort"])
                );

                await smtp.AuthenticateAsync(
                    _config["EmailSetting:FromEmail"],
                    Environment.GetEnvironmentVariable("EMAIL_PASSWORD")
                );

                await smtp.SendAsync(message);

                await smtp.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                throw new Exception($"Faild Sending an email {ex}");
            }
            
        }   
    }
}
