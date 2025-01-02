<template>
  <div class="auth-modal">
    <div class="modal-backdrop" @click="$emit('close')"></div>
    <div class="modal-content">
      <h2>{{ isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
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
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { auth } from '../utils/auth'
import { toast } from './Toast.vue'

export default defineComponent({
  name: 'AuthModal',
  emits: ['close', 'auth-success'],
  setup(_, { emit }) {
    const isLogin = ref(true)
    const email = ref('')
    const password = ref('')
    const rememberMe = ref(false)

    const toggleMode = () => {
      isLogin.value = !isLogin.value
    }

    // Load saved credentials
    onMounted(() => {
      const savedEmail = localStorage.getItem('remembered_email')
      const savedPassword = localStorage.getItem('remembered_password')
      if (savedEmail && savedPassword) {
        email.value = savedEmail
        password.value = atob(savedPassword) // decode base64
        rememberMe.value = true
      }
    })

    const handleSubmit = async () => {
      try {
        const success = isLogin.value 
          ? await auth.login(email.value, password.value)
          : await auth.register(email.value, password.value)

        if (success) {
          // Save credentials if remember me is checked
          if (rememberMe.value) {
            localStorage.setItem('remembered_email', email.value)
            localStorage.setItem('remembered_password', btoa(password.value)) // encode base64
          } else {
            localStorage.removeItem('remembered_email')
            localStorage.removeItem('remembered_password')
          }

          toast.show(
            isLogin.value ? 'Đăng nhập thành công!' : 'Đăng ký thành công!', 
            'success'
          )
          emit('auth-success')
          emit('close')
        }
      } catch (error: any) {
        toast.show(error.message || 'Đăng nhập thất bại', 'error')
      }
    }

    return {
      isLogin,
      email,
      password,
      rememberMe,
      toggleMode,
      handleSubmit
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
</style>
