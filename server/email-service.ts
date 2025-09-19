import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  provider: 'smtp' | 'gmail' | 'outlook' | 'console';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  gmail?: {
    user: string;
    pass: string; // App password
  };
  outlook?: {
    user: string;
    pass: string;
  };
  from?: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: any = null;
  private config: EmailConfig;

  private constructor() {
    // Default configuration - logs to console
    this.config = {
      provider: 'console',
      from: 'noreply@waltontrailers.com'
    };
    this.initializeFromEnv();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeFromEnv() {
    // Check for email configuration in environment variables
    const provider = process.env.EMAIL_PROVIDER as EmailConfig['provider'];
    
    if (provider === 'smtp' && process.env.SMTP_HOST) {
      this.config = {
        provider: 'smtp',
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        },
        from: process.env.EMAIL_FROM || 'noreply@waltontrailers.com'
      };
    } else if (provider === 'gmail' && process.env.GMAIL_USER) {
      this.config = {
        provider: 'gmail',
        gmail: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD || ''
        },
        from: process.env.EMAIL_FROM || process.env.GMAIL_USER
      };
    } else if (provider === 'outlook' && process.env.OUTLOOK_USER) {
      this.config = {
        provider: 'outlook',
        outlook: {
          user: process.env.OUTLOOK_USER,
          pass: process.env.OUTLOOK_PASS || ''
        },
        from: process.env.EMAIL_FROM || process.env.OUTLOOK_USER
      };
    }

    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      switch (this.config.provider) {
        case 'smtp':
          if (this.config.smtp) {
            this.transporter = nodemailer.createTransport({
              host: this.config.smtp.host,
              port: this.config.smtp.port,
              secure: this.config.smtp.secure,
              auth: {
                user: this.config.smtp.user,
                pass: this.config.smtp.pass
              }
            });
          }
          break;

        case 'gmail':
          if (this.config.gmail) {
            this.transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: this.config.gmail.user,
                pass: this.config.gmail.pass
              }
            });
          }
          break;

        case 'outlook':
          if (this.config.outlook) {
            this.transporter = nodemailer.createTransport({
              service: 'hotmail',
              auth: {
                user: this.config.outlook.user,
                pass: this.config.outlook.pass
              }
            });
          }
          break;

        case 'console':
        default:
          // No transporter needed for console logging
          break;
      }

      // Test connection for real email providers
      if (this.transporter && this.config.provider !== 'console') {
        await this.transporter.verify();
        console.log(`✅ Email service connected: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`❌ Email service connection failed:`, error);
      // Fallback to console logging
      this.config.provider = 'console';
      this.transporter = null;
    }
  }

  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      if (this.config.provider === 'console' || !this.transporter) {
        // Log to console (development mode)
        console.log("\n=== EMAIL SENT (Console Mode) ===");
        console.log(`To: ${message.to}`);
        console.log(`From: ${this.config.from}`);
        console.log(`Subject: ${message.subject}`);
        console.log("\n--- EMAIL CONTENT ---");
        console.log(message.text || message.html);
        console.log("================================\n");
        return true;
      }

      // Send actual email
      const result = await this.transporter.sendMail({
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      });

      console.log(`✅ Email sent to ${message.to} - Message ID: ${result.messageId}`);
      return true;

    } catch (error) {
      console.error("❌ Failed to send email:", error);
      
      // Fallback to console logging if email fails
      console.log("\n=== EMAIL SENT (Fallback to Console) ===");
      console.log(`To: ${message.to}`);
      console.log(`From: ${this.config.from}`);
      console.log(`Subject: ${message.subject}`);
      console.log("\n--- EMAIL CONTENT ---");
      console.log(message.text || message.html);
      console.log("====================================\n");
      
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/admin/reset-password?token=${resetToken}`;
    
    const emailContent: EmailMessage = {
      to: email,
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #1f2937; margin: 0; }
    .content { margin-bottom: 30px; }
    .button { 
      display: inline-block; 
      background-color: #3b82f6; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .button:hover { background-color: #2563eb; }
    .link { word-break: break-all; color: #6b7280; font-size: 14px; }
    .footer { 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      color: #9ca3af; 
      font-size: 12px; 
    }
    .warning { color: #6b7280; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Walton Trailers</h1>
    </div>
    
    <div class="content">
      <h2 style="color: #374151;">Password Reset Request</h2>
      
      <p>Hello,</p>
      
      <p>You requested a password reset for your Walton Trailers admin account.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Your Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p class="link">${resetUrl}</p>
      
      <p class="warning">
        This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>Walton Trailers Admin System</p>
    </div>
  </div>
</body>
</html>
      `
    };

    return this.sendEmail(emailContent);
  }

  async sendDealerPasswordResetEmail(email: string, dealerName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/dealer/reset-password/${resetToken}`;
    
    const emailContent: EmailMessage = {
      to: email,
      subject: "Password Reset - Walton Trailers Dealer Portal",
      text: `
Hello ${dealerName},

We received a request to reset your password for the Walton Trailers dealer portal.

Click the link below to reset your password:
${resetUrl}

This link will expire in 2 hours. If you didn't request this reset, you can safely ignore this email.

Best regards,
Walton Trailers Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - Dealer Portal</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { 
      display: inline-block; 
      background: #3b82f6; 
      color: white; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover { background: #2563eb; }
    .warning { 
      background: #fef3c7; 
      border-left: 4px solid #f59e0b; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px;
    }
    .footer { 
      padding: 20px; 
      text-align: center; 
      color: #666; 
      background: #f8f9fa;
      border-radius: 0 0 8px 8px;
      font-size: 14px;
    }
    .url-break { word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚛 Walton Trailers</h1>
      <p style="margin: 5px 0 0 0;">Dealer Portal - Password Reset</p>
    </div>
    
    <div class="content">
      <h2 style="color: #374151; margin-top: 0;">Hello ${dealerName},</h2>
      
      <p>We received a request to reset your password for the Walton Trailers dealer portal.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset My Password</a>
      </div>
      
      <p><strong>This link will expire in 2 hours</strong> for security purposes.</p>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong><br>
        If you didn't request this password reset, please ignore this email. 
        Your account remains secure and no changes have been made.
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="url-break">${resetUrl}</div>
    </div>
    
    <div class="footer">
      <p><strong>Walton Trailers</strong><br>
      Dealer Support Team<br>
      <small>If you have questions, contact us at support@waltontrailers.com</small></p>
    </div>
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

  // Get current configuration info
  getConfig(): { provider: string; from?: string } {
    return {
      provider: this.config.provider,
      from: this.config.from
    };
  }

  // Reconfigure email service
  async configure(newConfig: Partial<EmailConfig>): Promise<boolean> {
    this.config = { ...this.config, ...newConfig };
    await this.initializeTransporter();
    return this.transporter !== null || this.config.provider === 'console';
  }
}