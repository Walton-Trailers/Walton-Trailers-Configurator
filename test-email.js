// Test email script
import { EmailService } from './server/email-service.js';

async function sendTestEmail() {
  try {
    console.log('🚀 Testing Gmail SMTP configuration...');
    
    const emailService = EmailService.getInstance();
    
    const testMessage = {
      to: 'bryan@relloagency.com',
      subject: 'Test Email - Walton Trailers SMTP Configuration',
      text: 'This is a test email to verify your new Gmail SMTP configuration is working correctly! The Walton Trailers configurator email system is now ready to use.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">Gmail SMTP Test Successful! ✅</h2>
          <p>Hello!</p>
          <p>This is a test email to verify your new Gmail SMTP configuration is working correctly.</p>
          <p style="color: #059669; font-weight: bold;">✅ Your Gmail SMTP setup is working perfectly!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Configuration Details:</h3>
            <ul style="color: #6b7280;">
              <li>Provider: Gmail SMTP</li>
              <li>Service: Walton Trailers Configurator</li>
              <li>Test Date: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p>The Walton Trailers configurator email system is now ready to use for:</p>
          <ul>
            <li>Password reset emails</li>
            <li>Quote notifications</li>
            <li>System notifications</li>
          </ul>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">Sent from Walton Trailers Configurator System</p>
        </div>`
    };
    
    const success = await emailService.sendEmail(testMessage);
    
    if (success) {
      console.log('✅ Test email sent successfully to bryan@relloagency.com');
      console.log('📧 Please check the inbox (and spam folder) for the test email');
    } else {
      console.log('❌ Test email failed to send');
    }
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

sendTestEmail();