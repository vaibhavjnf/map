<template>
  <div class="lucky-money-container">
    <div v-for="(envelope, index) in envelopes"
         :key="index"
         class="envelope"
         :style="envelope.style"
         @click="openEnvelope(index)"
         :class="{ 'opened': envelope.opened }">
      🧧
    </div>
    <div v-if="showMessage" class="lucky-message">
      <div class="message-content">
        {{ currentMessage }}
        <div class="decoration">✨</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const luckyMessages = [
  "Phát tài phát lộc! 💰",
  "Vạn sự như ý! ✨",
  "Sức khỏe dồi dào! 💪",
  "May mắn tới tấp! 🍀",
  "Tiền vào như nước! 💸"
];

interface EnvelopeStyle {
  left: string;
  animationDuration: string;
  animationDelay: string;
}

interface Envelope {
  style: EnvelopeStyle;
  opened: boolean;
  message: string;
}

const envelopes = ref<Envelope[]>([]);
const showMessage = ref(false);
const currentMessage = ref('');

const createEnvelope = () => {
  const style: EnvelopeStyle = {
    left: `${Math.random() * 120 - 10}vw`,
    animationDuration: `${Math.random() * 4 + 3}s`,
    animationDelay: `${Math.random() * 2}s`
  };
  const message = luckyMessages[Math.floor(Math.random() * luckyMessages.length)];
  envelopes.value.push({ style, opened: false, message });
};

const openEnvelope = (index: number) => {
  if (!envelopes.value[index].opened && !showMessage.value) {
    envelopes.value[index].opened = true;
    currentMessage.value = envelopes.value[index].message;
    showMessage.value = true;
    setTimeout(() => {
      showMessage.value = false;

      envelopes.value = envelopes.value.filter((_, i) => i !== index);
    }, 2000);
  }
};

onMounted(() => {
  for (let i = 0; i < 10; i++) {
    createEnvelope();
  }
});
</script>

<style scoped>
.lucky-money-container {
  position: fixed;
  width: 100%;
  height: 100vh;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
}

.envelope {
  position: absolute;
  font-size: min(2rem, 8vw);
  padding: 5px;
  border-radius: 8px;
  animation: falling linear infinite;
  background: linear-gradient(45deg, #ffd700, #e74c3c);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  cursor: pointer;
  transition: transform 0.3s;
  pointer-events: auto;
}

.envelope:hover {
  transform: scale(1.2);
}

.envelope.opened {
  animation: disappear 0.5s forwards;
  pointer-events: none;
}

.lucky-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(45deg, #ffd700, #ff6b6b);
  padding: 20px;
  border-radius: 20px;
  font-size: min(1.8rem, 6vw);
  white-space: normal;
  max-width: 90vw;
  text-align: center;
  animation: appearMessage 0.5s ease-out;
  z-index: 1000;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.message-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.decoration {
  animation: sparkle 1s infinite;
}

@keyframes falling {
  0% {
    transform: translateY(-20vh) translateX(0) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(45vh) translateX(calc(10vw * var(--direction, 1))) rotate(180deg) scale(1.2);
  }
  100% {
    transform: translateY(120vh) translateX(0) rotate(360deg) scale(1);
  }
}

@keyframes disappear {
  to {
    transform: scale(0);
    opacity: 0;
  }
}

@keyframes appearMessage {
  from {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes sparkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .envelope {
    padding: 3px;
  }

  .lucky-message {
    padding: 15px 25px;
  }
}
</style>

