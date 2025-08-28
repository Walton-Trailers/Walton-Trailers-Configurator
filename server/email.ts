import crypto from "crypto";

interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

// Internal email service (logs to console for development)
export class EmailService {
  private static instance: EmailService;
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      // For development, we'll log the email content to console
      // In production, this would integrate with your email provider
      console.log("\n=== EMAIL SENT ===");
      console.log(`To: ${message.to}`);
      console.log(`From: ${message.from}`);
      console.log(`Subject: ${message.subject}`);
      console.log("\n--- EMAIL CONTENT ---");
      console.log(message.text || message.html);
      console.log("==================\n");
      
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/admin/reset-password?token=${resetToken}`;
    
    const emailContent = {
      to: email,
      from: "noreply@waltontrailers.com",
      subject: "Password Reset - Walton Trailers Admin",
      text: `
Hello,

You requested a password reset for your Walton Trailers admin account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

Best regards,
Walton Trailers Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1f2937;">Walton Trailers</h1>
    </div>
    
    <h2 style="color: #374151;">Password Reset Request</h2>
    
    <p>Hello,</p>
    
    <p>You requested a password reset for your Walton Trailers admin account.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Your Password
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
    
    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      Walton Trailers Admin System
    </p>
  </div>
</body>
</html>
      `
    };

    return this.sendEmail(emailContent);
  }

  // Generate secure reset token
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}