using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Seniors2027.BLL.Interfaces;

namespace Seniors2027.BLL.Services;

public class EmailService(IConfiguration config) : IEmailService
{
    private const int OtpExpiryMinutes = 20;
    private readonly IConfiguration _config = config;

    public async Task SendOtpEmailAsync(string toEmail, string otp)
    {
        try
        {
            var fromEmail = GetRequiredSetting("EmailSetting:FromEmail");
            var smtpHost = GetRequiredSetting("EmailSetting:SmtpHost");
            var smtpPortRaw = GetRequiredSetting("EmailSetting:SmtpPort");
            var emailPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");

            if (!int.TryParse(smtpPortRaw, out var smtpPort))
            {
                throw new InvalidOperationException("EmailSetting:SmtpPort must be a valid integer.");
            }

            if (string.IsNullOrWhiteSpace(emailPassword))
            {
                throw new InvalidOperationException("EMAIL_PASSWORD environment variable is missing.");
            }

            var htmlBody = $@"
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
                          <p style='margin:14px 0 0 0;font-size:14px;'>This code expires in <strong>{OtpExpiryMinutes} minutes</strong>.</p>
                          <p style='margin:8px 0 0 0;font-size:13px;opacity:0.85;'>If this was not you, ignore this email.</p>
                        </div>
                      </div>
                    </div>";

            using var message = new MailMessage(fromEmail, toEmail)
            {
                Subject = "Your OTP Verification Code",
                Body = htmlBody,
                IsBodyHtml = true
            };

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(fromEmail, emailPassword),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            await smtp.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed sending email. {ex.Message}", ex);
        }
    }

    private string GetRequiredSetting(string key)
    {
        var value = _config[key];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Missing required configuration value: {key}");
        }

        return value;
    }
}
