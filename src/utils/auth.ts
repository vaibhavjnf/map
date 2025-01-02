import { ref } from 'vue'
import { db } from './database'
import { cookies } from './cookies'
import { emailService } from './emailService'

interface User {
  id: string;
  email: string;
  name?: string;
  aiCredits: number;
  lastLoginAt: Date;
}

export const currentUser = ref<User | null>(null)
export const isAuthenticated = ref(false)

const hashPassword = async (password: string): Promise<string> => {
  try {
    console.log('Hashing password...');
    const encoder = new TextEncoder();
    const data = encoder.encode(password + import.meta.env.VITE_AUTH_SALT);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

export const auth = {
  async login(email: string, password: string): Promise<boolean> {
    try {
      console.log('Login attempt for:', email);
      
      const user = await db.findUserByEmail(email);
      if (!user) {
        throw new Error('Email không tồn tại');
      }

      // Kiểm tra password phải tồn tại
      if (!user.password) {
        console.error('User has no password:', email);
        throw new Error('Lỗi xác thực');
      }

      // Log để debug (không log password gốc)
      console.log('Login check:', {
        email,
        hasPassword: !!user.password,
        passwordLength: user.password.length
      });

      const hashedPassword = await hashPassword(password);
      const passwordMatch = hashedPassword === user.password;
      
      console.log('Password verification:', {
        matched: passwordMatch,
        hashedLength: hashedPassword.length,
        storedLength: user.password.length
      });

      if (!passwordMatch) {
        // Clear remembered login on failed attempts
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
        throw new Error('Mật khẩu không chính xác');
      }

      // Update user session
      await db.updateUser(user.id, {
        lastLoginAt: new Date().toISOString()
      });
      await db.createSession(user.id);

      currentUser.value = {
        ...user,
        lastLoginAt: new Date(user.lastLoginAt)
      };
      isAuthenticated.value = true;

      const token = this.generateToken(user.id);
      cookies.set('auth_token', token, { expires: 7 }); // Cookie expires in 7 days
      localStorage.setItem('userId', user.id);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  generateToken(userId: string): string {
    const timestamp = Date.now()
    const data = `${userId}-${timestamp}-${import.meta.env.VITE_AUTH_SALT}`
    return btoa(data) 
  },

  async sendVerificationOTP(email: string, userId: string): Promise<boolean> {
    const otp = await db.createOTP(email, userId);
    return emailService.sendOTP(email, otp);
  },

  async verifyOTP(email: string, code: string): Promise<boolean> {
    return db.verifyOTP(email, code);
  },

  async register(email: string, password: string): Promise<boolean> {
    try {
      console.log('Starting registration for:', email);
      
      const existingUser = await db.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }

      // Hash password before creating user
      const hashedPassword = await hashPassword(password);
      console.log('Registration password hash length:', hashedPassword.length);

      const user = await db.createUser({
        email,
        password: hashedPassword,
        aiCredits: 0,
        lastLoginAt: new Date().toISOString()
      });

      // Verify the stored password hash
      const storedUser = await db.findUserByEmail(email);
      console.log('Stored user password verification:', {
        hasStoredPassword: !!storedUser?.password,
        passwordLength: storedUser?.password?.length
      });

      // Then try to send OTP
      const otpSent = await this.sendVerificationOTP(email, user.id);
      if (!otpSent) {
        // Don't clear all data, just mark user as unverified
        throw new Error('Không thể gửi mã xác thực, vui lòng thử lại sau');
      }

      return true;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  async completeRegistration(email: string, code: string): Promise<boolean> {
    try {
      const isVerified = await this.verifyOTP(email, code);
      if (!isVerified) {
        throw new Error('Invalid or expired OTP code');
      }

      // Tìm user và thêm credits
      const user = await db.findUserByEmail(email);
      if (!user) throw new Error('User not found');

      // Thêm credits và kiểm tra thành công
      await db.addCredits(user.id, 100);
      const updatedUser = await db.getUser(user.id);
      
      if (!updatedUser || updatedUser.aiCredits !== 100) {
        console.error('Failed to add credits:', {
          before: user.aiCredits,
          after: updatedUser?.aiCredits
        });
        throw new Error('Failed to add initial credits');
      }

      console.log('Registration completed:', {
        email: user.email,
        credits: updatedUser.aiCredits
      });

      // Cập nhật currentUser với credits mới
      currentUser.value = {
        ...updatedUser,
        lastLoginAt: new Date(updatedUser.lastLoginAt)
      };
      isAuthenticated.value = true;

      // Set token và lưu user ID
      const token = this.generateToken(user.id);
      cookies.set('auth_token', token);
      localStorage.setItem('userId', user.id);

      return true;
    } catch (error) {
      console.error('Complete registration error:', error);
      throw error;
    }
  },

  logout() {
    currentUser.value = null;
    isAuthenticated.value = false;
    cookies.remove('auth_token');
    localStorage.removeItem('userId');
    // Don't clear remembered login on logout
  },

  async checkAuth() {
    const token = cookies.get('auth_token');
    const userId = token || localStorage.getItem('userId');
    const rememberedEmail = localStorage.getItem('remembered_email');
    const rememberedPassword = localStorage.getItem('remembered_password');

    if (rememberedEmail && rememberedPassword) {
      try {
        await this.login(rememberedEmail, atob(rememberedPassword));
        return;
      } catch (error) {
        console.error('Auto login failed:', error);
        // Clear remembered credentials if auto login fails
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
      }
    }

    if (userId) {
      try {
        const user = await db.getUser(userId)
        if (user) {
          currentUser.value = {
            ...user,
            lastLoginAt: new Date(user.lastLoginAt)
          }
          isAuthenticated.value = true
          
          if (token) {
            cookies.set('auth_token', userId)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        this.logout()
      }
    }
  },

  async useAICredits(amount: number = 1): Promise<boolean> {
    if (!currentUser.value || currentUser.value.aiCredits < amount) {
      return false;
    }

    const today = new Date().toDateString();
    const dailyUsage = parseInt(localStorage.getItem(`daily_usage_${currentUser.value.id}_${today}`) || '0');
    const DAILY_LIMIT = 50;

    if (dailyUsage >= DAILY_LIMIT) {
      throw new Error('Bạn đã đạt giới hạn sử dụng trong ngày. Vui lòng thử lại vào ngày mai.');
    }

    currentUser.value.aiCredits -= amount;
    await db.updateUser(currentUser.value.id, { aiCredits: currentUser.value.aiCredits });
    
    localStorage.setItem(`daily_usage_${currentUser.value.id}_${today}`, (dailyUsage + 1).toString());
    
    return true;
  }
}

