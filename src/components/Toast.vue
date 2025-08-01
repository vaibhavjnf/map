<template>
  <transition name="toast">
    <div v-if="message" class="toast" :class="type">
      <span class="material-icons">{{ icon }}</span>
      <span class="message">{{ message }}</span>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue' 

export const toast = {
  message: ref(''),
  type: ref('info'),
  timeout: ref<number | null>(null),

  show(msg: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {

    if (this.timeout.value) {
      clearTimeout(this.timeout.value)
    }

    if (type === 'error') {
      this.message.value = msg
      duration = 8000 
      console.error('Toast Error:', msg)
    } else {
      this.message.value = msg
    }
    
    this.type.value = type

    this.timeout.value = window.setTimeout(() => {
      this.message.value = ''
    }, duration)
  }
}

export default defineComponent({
  name: 'Toast',
  setup() {
    return {
      message: toast.message,
      type: toast.type,
      icon: computed(() => {
        switch (toast.type.value) {
          case 'success': return 'check_circle'
          case 'error': return 'error'
          default: return 'info'
        }
      })
    }
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 60px; 
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2000;
  font-family: 'Inter', sans-serif;
  min-width: 200px;
  max-width: 400px;
  white-space: pre-line;
  text-align: left;
}

.toast.success {
  background: #4CAF50;
  color: white;
}

.toast.error {
  background: #f44336;
  color: white;
  padding: 16px 24px;
  font-size: 13px;
  line-height: 1.4;
}

.toast.info {
  background: #2196F3;
  color: white;
}

.message {
  font-size: 14px;
  font-weight: 500;
}

.material-icons {
  font-size: 20px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -30px);
}

@media (max-width: 768px) {
  .toast {
    width: calc(100% - 48px);
    max-width: 320px; 
    top: 140px; 
    padding: 10px 16px;
    font-size: 13px; 
    min-width: auto; 
  }

  .toast.error {
    padding: 12px 16px; 
    font-size: 12px; 
  }

  .message {
    font-size: 13px; 
    line-height: 1.3; 
  }

  .material-icons {
    font-size: 18px; 
  }
}
</style>
