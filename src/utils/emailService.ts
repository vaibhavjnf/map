import { toast } from '../components/Toast.vue';

class EmailService {
  constructor() {
    try {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (!publicKey) throw new Error('EmailJS public key not found');
      
      (window as any).emailjs.init(publicKey);
      console.log('EmailJS initialized successfully');
      
    } catch (error) {
      console.error('EmailJS initialization failed:', error);
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

      console.log('Preparing to send email with:', {
        serviceId,
        templateId,
        email
      });

      // Basic validation
      if (!serviceId || !templateId) {
        throw new Error('Missing email configuration');
      }

      const response = await (window as any).emailjs.send(
        serviceId,
        templateId,
        {
          to_email: email,
          to_name: email.split('@')[0],
          message: otp,
          from_name: 'Vue Map'
        }
      );

      console.log('Email sent successfully:', response);
      toast.show('Mã OTP đã được gửi đến email của bạn!', 'success');
      return true;

    } catch (error: any) {
      console.error('Email send error details:', {
        error,
        message: error.message,
        text: error.text,
        status: error.status
      });
      
      const errorMessage = error.text || error.message || 'Unknown error';
      toast.show(`Không thể gửi mã OTP: ${errorMessage}`, 'error');
      return false;
    }
  }
}

export const emailService = new EmailService();
