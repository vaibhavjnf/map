<template>
  <div class="social-share" :class="{ 'collapsed': isCollapsed }">
    <button class="toggle-btn" @click.stop="toggleMenu">
      <span class="icon">{{ isCollapsed ? '📱' : '✕' }}</span>
    </button>

    <div class="share-menu" :class="{ 'hidden': isCollapsed }">
      <Teleport to="body">
        <div v-if="showQR" class="qr-modal" @click="showQR = false">
          <div class="qr-container" @click.stop>
            <div class="qr-header">
              <h3>Quét mã QR</h3>
              <button class="close-btn" @click="showQR = false">✕</button>
            </div>
            <qrcode-vue
              :value="websiteUrl"
              :size="200"
              level="H"
              render-as="svg"
              :background="'#ffffff'"
              :foreground="'#e74c3c'"
              :margin="2"
            />
            <p class="qr-text">Quét để xem lời chúc Tết</p>
          </div>
        </div>
      </Teleport>

      <div class="share-buttons">
        <button class="share-btn qr" @click="showQR = true">
          <span class="icon">📱</span>
          <span class="label">Mã QR</span>
        </button>

        <button class="share-btn facebook" @click="shareToFacebook">
          <span class="icon">📱</span>
          <span class="label">Facebook</span>
        </button>
        <button class="share-btn zalo" @click="shareToZalo">
          <span class="icon">💬</span>
          <span class="label">Zalo</span>
        </button>
        <button class="share-btn copy" @click="copyLink">
          <span class="icon">📋</span>
          <span class="label">Copy Link</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import QrcodeVue from 'vue-qrcode';

const showQR = ref(false);
const isCollapsed = ref(true); // Mặc định đóng trên mobile

const toggleMenu = () => {
  isCollapsed.value = !isCollapsed.value;
  // Đóng QR modal khi đóng menu
  if (isCollapsed.value) {
    showQR.value = false;
  }
};

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const shareEl = document.querySelector('.social-share');
  if (shareEl && !shareEl.contains(event.target as Node)) {
    isCollapsed.value = true;
    showQR.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  // Tự động đóng menu trên mobile
  const isMobile = window.innerWidth <= 768;
  isCollapsed.value = isMobile;
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const shareMessage = "🎊 Chúc Mừng Năm Mới 2025 - Năm Rồng 🐲";
const websiteUrl = window.location.href;

const shareToFacebook = () => {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}&quote=${encodeURIComponent(shareMessage)}`;
  window.open(url, '_blank');
};

const shareToZalo = () => {
  const url = `https://zalo.me/share?u=${encodeURIComponent(websiteUrl)}&t=${encodeURIComponent(shareMessage)}`;
  window.open(url, '_blank');
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(websiteUrl);
    alert('Đã sao chép link!');
  } catch (err) {
    console.error('Không thể sao chép:', err);
  }
};
</script>

<style scoped>
.social-share {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 100;
}

.toggle-btn {
  position: relative;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid #ffd700;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 101;
  transition: all 0.3s ease;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.share-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
}

.share-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #ffd700;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.share-btn:hover {
  transform: translateX(5px);
  background: linear-gradient(45deg, #ffd700, #ff6b6b);
  color: white;
}

.icon {
  font-size: 1.2rem;
}

.label {
  font-size: 0.9rem;
  font-weight: 600;
}

.qr-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  padding: 16px;
}

.qr-container {
  position: relative;
  background: white;
  width: min(320px, calc(100vw - 32px));
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  text-align: center;
}

.qr-header {
  display: flex;

  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.qr-header h3 {
  margin: 0;
  color: #e74c3c;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px;
  color: #666;
}

.qr-text {
  margin-top: 15px;
  color: #666;
  font-size: 0.9rem;
}

.share-btn.qr {
  background: linear-gradient(45deg, #ffd700, #e74c3c);
  color: white;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-width: 768px) {
  .social-share {
    left: 10px;
    bottom: 10px;
  }

  .share-btn {
    padding: 8px 12px;
  }

  .label {
    display: none;
  }

  .icon {
    font-size: 1.5rem;
  }

  .qr-container {
    padding: 15px;
    margin: 20px;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .social-share.collapsed .share-menu {
    visibility: hidden;
  }

  .share-menu {
    position: absolute;
    bottom: 55px;
    left: 0;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.3s ease;
  }

  .share-menu.hidden {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
  }

  .qr-modal {
    display: grid;
    place-items: center;
    padding: 16px;
  }

  .qr-container {
    width: min(320px, calc(100vw - 32px));
    padding: 16px;
    margin: 0;
    position: relative;
    top: auto;
    left: auto;
    transform: none;
  }

  qrcode-vue {
    max-width: 100%;
    height: auto !important;
  }

  .qr-header h3 {
    font-size: 1.1rem;
  }

  .qr-text {
    font-size: 0.85rem;
    margin-top: 10px;
  }
}
</style>
