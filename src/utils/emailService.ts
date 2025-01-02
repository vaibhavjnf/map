import { toast } from '../components/Toast.vue';

class EmailService {
  private initialized: boolean = false;
  private readonly publicKey: string;
  private readonly serviceId: string;
  private readonly templateId: string;

  constructor() {

    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    this.templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  }

  private async init() {
    if (this.initialized) return;

    try {
   
      (window as any).emailjs.init({
        publicKey: this.publicKey,
        limitRate: { 
          throttle: 1000,
          total: 3
        },
        blockHeadless: false,
        blockList: { 
          list: [],
          watchVariable: false,
        }
      });
      
      this.initialized = true;
      console.log('EmailJS initialized');
    } catch (error) {
      console.error('EmailJS init error:', error);
      throw error;
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    try {
      await this.init();

      if (!email?.trim()) {
        throw new Error('Email address is required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      console.log('Sending OTP to:', email);

      const templateParams = {
        to_email: email,
        to_name: email.split('@')[0],
        otp_code: otp,  
        from_name: 'AI Map'  
      };

      const response = await (window as any).emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      if (response.status === 200) {
        toast.show(`Mã OTP đã được gửi đến ${email}`, 'success');
        return true;
      }
      
      throw new Error(`Send failed: ${response.status}`);
    } catch (error: any) {
      console.error('Send email error:', {
        error,
        status: error.status,
        text: error.text
      });
      
      const errorMessage = error.text || error.message || 'Unknown error';
      toast.show(`Không thể gửi mã OTP: ${errorMessage}`, 'error');
      return false;
    }
  }
}

export const emailService = new EmailService();
