// Email configuration management
interface EmailSettings {
  provider: 'console' | 'smtp' | 'gmail' | 'outlook';
  fromAddress: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  outlookUser?: string;
  outlookPass?: string;
}

class EmailConfigManager {
  private static instance: EmailConfigManager;
  private settings: EmailSettings;

  private constructor() {
    // Load from environment variables or defaults
    this.settings = {
      provider: (process.env.EMAIL_PROVIDER as EmailSettings['provider']) || 'console',
      fromAddress: process.env.EMAIL_FROM || 'noreply@waltontrailers.com',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      gmailUser: process.env.GMAIL_USER,
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
      outlookUser: process.env.OUTLOOK_USER,
      outlookPass: process.env.OUTLOOK_PASS,
    };
  }

  static getInstance(): EmailConfigManager {
    if (!EmailConfigManager.instance) {
      EmailConfigManager.instance = new EmailConfigManager();
    }
    return EmailConfigManager.instance;
  }

  getSettings(): EmailSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<EmailSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Get settings without sensitive data
  getPublicSettings() {
    return {
      provider: this.settings.provider,
      fromAddress: this.settings.fromAddress,
      smtpHost: this.settings.smtpHost,
      smtpPort: this.settings.smtpPort,
      smtpSecure: this.settings.smtpSecure,
      gmailUser: this.settings.gmailUser,
      outlookUser: this.settings.outlookUser,
    };
  }

  // Validate email configuration
  validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.settings.fromAddress || !this.isValidEmail(this.settings.fromAddress)) {
      errors.push('Valid from address is required');
    }

    switch (this.settings.provider) {
      case 'smtp':
        if (!this.settings.smtpHost) errors.push('SMTP host is required');
        if (!this.settings.smtpUser) errors.push('SMTP user is required');
        if (!this.settings.smtpPass) errors.push('SMTP password is required');
        break;
      case 'gmail':
        if (!this.settings.gmailUser) errors.push('Gmail user is required');
        if (!this.settings.gmailAppPassword) errors.push('Gmail app password is required');
        break;
      case 'outlook':
        if (!this.settings.outlookUser) errors.push('Outlook user is required');
        if (!this.settings.outlookPass) errors.push('Outlook password is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export { EmailConfigManager, type EmailSettings };