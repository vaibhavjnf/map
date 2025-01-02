
<template>
  <div class="auth-modal">
    <div class="modal-backdrop" @click="$emit('close')"></div>
    <div class="modal-content">
      <h2>{{ getTitle }}</h2>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        
        <template v-if="!showOtpVerification">
          <div class="form-group">
            <label>Email</label>
            <input 
              v-model="email"
              type="email" 
              required
              placeholder="email@example.com"
            >
          </div>

          <div class="form-group">
            <label>Mật khẩu</label>
            <input 
              v-model="password"
              type="password" 
              required
              placeholder="••••••••"
            >
          </div>

          <div class="remember-me">
            <input 
              type="checkbox" 
              id="remember" 
              v-model="rememberMe"
            >
            <label for="remember">Ghi nhớ đăng nhập</label>
          </div>

          <button type="submit" class="submit-btn">
            {{ isLogin ? 'Đăng nhập' : 'Đăng ký' }}
          </button>

          <p class="switch-mode">
            {{ isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?' }}
            <button type="button" @click="toggleMode">
              {{ isLogin ? 'Đăng ký ngay' : 'Đăng nhập' }}
            </button>
          </p>

          <div v-if="!isLogin" class="bonus-info">
            <span class="material-icons">stars</span>
            <p>Nhận ngay 100 AI credits khi đăng ký!</p>
          </div>
        </template>

        <template v-else>
          <div class="form-group">
            <label>Verification Code</label>
            <input 
              v-model="otpCode"
              type="text" 
              required
              pattern="\d{6}"
              maxlength="6"
              placeholder="Enter 6-digit code"
            >
          </div>

          <p class="otp-info">
            We sent a verification code to {{ email }}.
            <button type="button" @click="resendOTP" :disabled="resendCooldown > 0">
              Resend Code {{ resendCooldown > 0 ? `(${resendCooldown}s)` : '' }}
            </button>
          </p>

          <button type="submit" class="submit-btn">
            Verify Email
          </button>
        </template>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { auth } from '../utils/auth'
import { toast } from './Toast.vue'
import { db } from '../utils/database';

export default defineComponent({
  name: 'AuthModal',
  emits: ['close', 'auth-success'],
  setup(_, { emit }) {
    const isLogin = ref(true)
    const email = ref('')
    const password = ref('')
    const rememberMe = ref(false)
    const showOtpVerification = ref(false)
    const otpCode = ref('')
    const resendCooldown = ref(0)
    const pendingEmail = ref('')

    const toggleMode = () => {
      isLogin.value = !isLogin.value
    }

    const getTitle = computed(() => {
      if (showOtpVerification.value) return 'Verify Email'
      return isLogin.value ? 'Đăng nhập' : 'Đăng ký tài khoản'
    })

    onMounted(() => {
      const savedEmail = localStorage.getItem('remembered_email')
      const savedPassword = localStorage.getItem('remembered_password')
      if (savedEmail && savedPassword) {
        email.value = savedEmail
        password.value = atob(savedPassword) 
        rememberMe.value = true
      }
    })

    const startResendCooldown = () => {
      resendCooldown.value = 60
      const timer = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }

    const resendOTP = async () => {
      if (resendCooldown.value > 0) return
      
      try {
        const user = await db.findUserByEmail(pendingEmail.value)
        if (!user) throw new Error('User not found')
        
        await auth.sendVerificationOTP(pendingEmail.value, user.id)
        startResendCooldown()
      } catch (error: any) {
        toast.show(error.message || 'Failed to resend OTP', 'error')
      }
    }

    const handleSubmit = async () => {
      try {
        if (showOtpVerification.value) {
          const success = await auth.completeRegistration(pendingEmail.value, otpCode.value)
          if (success) {
            toast.show('Email verified successfully!', 'success')
            emit('auth-success')
            emit('close')
          }
          return
        }

        if (isLogin.value) {
     
          await auth.login(email.value, password.value)
          
          if (rememberMe.value) {
            localStorage.setItem('remembered_email', email.value)
            localStorage.setItem('remembered_password', btoa(password.value))
          } else {
            localStorage.removeItem('remembered_email')
            localStorage.removeItem('remembered_password')
          }

          emit('auth-success')
          emit('close')
        } else {
     
          await auth.register(email.value, password.value)
          pendingEmail.value = email.value
          showOtpVerification.value = true
          startResendCooldown()
        }
      } catch (error: any) {
        toast.show(error.message || 'Authentication failed', 'error')
      }
    }

    return {
      isLogin,
      email,
      password,
      rememberMe,
      toggleMode,
      handleSubmit,
      showOtpVerification,
      otpCode,
      resendCooldown,
      getTitle,
      resendOTP
    }
  }
})
</script>

<style scoped>
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.submit-btn {
  background: #1A73E8;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: #1557B0;
}

.switch-mode {
  text-align: center;
  color: #666;
}

.switch-mode button {
  background: none;
  border: none;
  color: #1A73E8;
  font-weight: 500;
  cursor: pointer;
  padding: 4px;
}

.bonus-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #E8F0FE;
  padding: 12px;
  border-radius: 8px;
  color: #1A73E8;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.remember-me input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.remember-me label {
  color: #666;
  font-size: 14px;
  cursor: pointer;
}

h2 {
  margin: 0;
  color: #1A73E8;
}

.otp-info {
  text-align: center;
  margin: 16px 0;
  color: #666;
}

.otp-info button {
  background: none;
  border: none;
  color: #1A73E8;
  font-weight: 500;
  cursor: pointer;
  padding: 4px;
}

.otp-info button:disabled {
  color: #999;
  cursor: not-allowed;
}
</style>
