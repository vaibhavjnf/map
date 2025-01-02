import { toast } from '../components/Toast.vue';
import { getSecret } from '../config/secrets';  

class EmailService {
  constructor() {
    try {
      (window as any).emailjs.init(getSecret('VITE_EMAILJS_PUBLIC_KEY')); 
      console.log('EmailJS initialized');
    } catch (error) {
      console.error('EmailJS initialization failed');
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
     
      const maskedEmail = email.replace(/(?<=.{3}).(?=.*@)/g, '*');
      console.log('Sending OTP to:', maskedEmail);

      const templateParams = {
        user_email: email,
        email: email,           
        recipient: email,       
        to_name: email.split('@')[0],
        otp_code: otp,
        message: `Your verification code is: ${otp}`,
        from_name: 'Vue Map'
      };

      console.log('Template params:', {
        to_name: templateParams.to_name,
        otp_code: '******',
        from_name: templateParams.from_name
      });

      const response = await (window as any).emailjs.send(
        getSecret('VITE_EMAILJS_SERVICE_ID'),
        getSecret('VITE_EMAILJS_TEMPLATE_ID'), 
        templateParams
      );

      console.log('Email sent:', response.status === 200 ? 'Success' : 'Failed');
      
      if (response.status === 200) {
        toast.show(`Mã OTP đã được gửi đến ${maskedEmail}`, 'success');
        return true;
      }

      throw new Error(`Send failed: ${response.status}`);

    } catch (error: any) {

      console.error('Send email error:', {
        status: error.status,
        type: error.name,
        message: 'Email send failed'
      });
      
      let errorMessage = 'Không thể gửi mã OTP\n';
      if (error.text) errorMessage += `Lỗi: ${error.text}\n`;
      if (error.status) errorMessage += `Mã lỗi: ${error.status}`;

      toast.show(errorMessage, 'error', 10000);
      return false;
    }
  }
}

export const emailService = new EmailService();
