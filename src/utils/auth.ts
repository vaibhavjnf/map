import { ref } from 'vue'
import { db } from './database'
import { cookies } from './cookies'

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
  const encoder = new TextEncoder();

  const data = encoder.encode(password + import.meta.env.VITE_AUTH_SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const auth = {
  async login(email: string, password: string): Promise<boolean> {
    try {
      console.log('Login attempt:', { email });
      
      const user = await db.findUserByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        throw new Error('Email không tồn tại');
      }

      const hashedPassword = await hashPassword(password);
      console.log('Password check:', {
        provided: hashedPassword,
        stored: user.password,
        match: hashedPassword === user.password
      });

      if (hashedPassword !== user.password) {
        throw new Error('Mật khẩu không chính xác');
      }

      await db.updateUser(user.id, {
        lastLoginAt: new Date().toISOString()
      })
      await db.createSession(user.id)

      currentUser.value = {
        ...user,
        lastLoginAt: new Date(user.lastLoginAt)
      }
      isAuthenticated.value = true

      const token = this.generateToken(user.id)
      cookies.set('auth_token', token)
      localStorage.setItem('userId', user.id)

      return true
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  generateToken(userId: string): string {
    const timestamp = Date.now()
    const data = `${userId}-${timestamp}-${import.meta.env.VITE_AUTH_SALT}`
    return btoa(data) 
  },

  async register(email: string, password: string): Promise<boolean> {
    try {
      const hashedPassword = await hashPassword(password)
      
      const user = await db.createUser({
        email,
        password: hashedPassword,
        aiCredits: 100,
        lastLoginAt: new Date().toISOString()
      })

      currentUser.value = {
        ...user,
        lastLoginAt: new Date(user.lastLoginAt)
      }
      isAuthenticated.value = true
      localStorage.setItem('userId', user.id)
      return true
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  },

  logout() {
    currentUser.value = null
    isAuthenticated.value = false
    cookies.remove('auth_token')
    localStorage.removeItem('userId')
  },

  async checkAuth() {
    const token = cookies.get('auth_token')
    const userId = token || localStorage.getItem('userId')

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

