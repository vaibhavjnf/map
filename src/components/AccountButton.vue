<template>
  <div class="account-container">
    <template v-if="isAuthenticated">
      <button class="account-button" @click="toggleMenu">
        <span class="material-icons avatar-icon">account_circle</span>
        <div class="user-info">
          <span class="username">{{ currentUser?.email }}</span>
          <span class="credits">{{ currentUser?.aiCredits }} credits</span>
        </div>
      </button>

      <div 
        v-if="showMenu && activeMenu !== 'explore'" 
        class="account-menu" 
        v-click-outside="closeMenu"
      >
        <div class="menu-header">
          <span class="email">{{ currentUser?.email }}</span>
          <span class="credits-label">Credits: {{ currentUser?.aiCredits }}</span>
        </div>
        <button class="menu-item logout" @click="handleLogout">
          <span class="material-icons">logout</span>
          Đăng xuất
        </button>
      </div>
    </template>

    <button v-else class="login-button" @click="showAuthModal = true">
      <span class="material-icons">login</span>
      <span class="login-text">Đăng nhập</span>
    </button>

    <AuthModal 
      v-if="showAuthModal" 
      @close="closeAuthModal"
      @auth-success="handleAuthSuccess"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { currentUser, isAuthenticated, auth } from '../utils/auth'
import AuthModal from './AuthModal.vue'
import { activeMenu, setActiveMenu } from '../utils/menuState' 

export default defineComponent({
  name: 'AccountButton',
  components: { AuthModal },
  setup() {
    const showMenu = ref(false)
    const showAuthModal = ref(false)

    const toggleMenu = () => {
      if (showMenu.value) {
        setActiveMenu(null)
      } else {
        setActiveMenu('account')
      }
      showMenu.value = !showMenu.value
    }

    const closeMenu = () => {
      showMenu.value = false
    }

    const handleLogout = () => {
      auth.logout()
      closeMenu()
    }

    const handleAuthSuccess = () => {
      showAuthModal.value = false
    }

    const closeAuthModal = () => {
      showAuthModal.value = false;
      setActiveMenu(null); 
    }

    watch(activeMenu, (newMenu) => {
      if (newMenu === 'explore' || newMenu === 'chat') {
        closeMenu()
      }
    })

    watch(showAuthModal, (isOpen) => {
      if (isOpen) {
        setActiveMenu('auth');
      } else {
        setActiveMenu(null);
      }
    });

    return {
      currentUser,
      isAuthenticated,
      showMenu,
      showAuthModal,
      toggleMenu,
      closeMenu,
      handleLogout,
      handleAuthSuccess,
      closeAuthModal,
      activeMenu
    }
  }
})
</script>

<style scoped>
.account-container {
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.account-button, .login-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.account-button:hover, .login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 115, 232, 0.15);
  border-color: rgba(26, 115, 232, 0.2);
}

.avatar-icon {
  color: #1A73E8;
  font-size: 22px;
  filter: drop-shadow(0 2px 4px rgba(26, 115, 232, 0.2));
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 3px;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.3px;
}

.credits {
  font-size: 12px;
  color: #1A73E8;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.account-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  min-width: 240px;
  z-index: 1000;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transform-origin: top right;
  animation: menuAppear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-header {
  padding: 18px;
  background: linear-gradient(to right, #f8faff, #ffffff);
  border-bottom: 1px solid #f0f4f8;
}

.email {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
}

.credits-label {
  font-size: 13px;
  color: #1A73E8;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  border: none;
  background: none;
  cursor: pointer;
  color: #2c3e50;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
}

.menu-item:hover {
  background-color: #f8faff;
}

.logout {
  color: #e53935;
}

.login-button {
  color: #1A73E8;
  font-weight: 600;
  letter-spacing: -0.3px;
}

@media (max-width: 767px) {
  .account-container {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 1000;
  }

  .account-button, .login-button {
    width: 39px;  
    height: 39px;
    padding: 0;
    border-radius: 10px; 
    justify-content: center;
    align-self: flex-start; 
    background: rgba(255, 255, 255, 0.98);
  }

  .account-button:active, .login-button:active {
    transform: scale(0.95);
  }

  .user-info {
    display: none;
  }

  .avatar-icon {
    margin: 0;
    font-size: 24px; 
  }

  .account-menu {
    right: 0;
    min-width: 240px; 
    max-width: calc(100vw - 24px);
    border-radius: 12px;
  }

  .menu-header {
    padding: 14px; 
  }
  
  .menu-item {
    padding: 12px 14px;
  }

  .login-text {
    display: none;
  }
}

@media (min-width: 768px) {
  .account-container {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 1000;
  }
}
</style>
