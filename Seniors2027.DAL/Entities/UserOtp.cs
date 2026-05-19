using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure.Identity;

namespace Seniors2027.DAL.Entities
{
    public class UserOtp
    {
        public int Id { get; set; }

        public string Email { get; set; } = string.Empty;

        public string OtpCode { get; set; } = string.Empty;


        public bool IsUsed { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiryTime { get; set; } 

        public int userId { get; set; }
        public User User { get; set; }
    }
}