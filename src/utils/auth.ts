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
      const user = await db.findUserByEmail(email)
      if (!user) throw new Error('User not found')

      const hashedPassword = await hashPassword(password)
      if (hashedPassword !== user.password) {
        console.log('Password mismatch:', { 
          provided: hashedPassword,
          stored: user.password
        });
        throw new Error('Invalid password')
      }

      await db.updateUser(user.id, {
        lastLoginAt: new Date().toISOString()
      })

      currentUser.value = {
        ...user,
        lastLoginAt: new Date(user.lastLoginAt)
      }
      isAuthenticated.value = true
      cookies.set('auth_token', user.id)
      localStorage.setItem('userId', user.id) 
      return true
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
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
      return false
    }
    currentUser.value.aiCredits -= amount
    await db.updateUser(currentUser.value.id, { aiCredits: currentUser.value.aiCredits })
    return true
  }
}
