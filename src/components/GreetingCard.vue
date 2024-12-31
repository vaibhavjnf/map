<template>
  <div class="card" @click="toggleAnimation">
    <div class="card-content" :class="{ 'animate': isAnimating }">
      <div class="fireworks">✨</div>
      <h1>Chúc Mừng Năm Mới</h1>
      <div class="countdown">
        <div class="time-block">
          <span class="number">{{ countdown.days }}</span>
          <span class="label">Ngày</span>
        </div>
        <div class="time-block">
          <span class="number">{{ countdown.hours }}</span>
          <span class="label">Giờ</span>
        </div>
        <div class="time-block">
          <span class="number">{{ countdown.minutes }}</span>
          <span class="label">Phút</span>
        </div>
        <div class="time-block">
          <span class="number">{{ countdown.seconds }}</span>
          <span class="label">Giây</span>
        </div>
      </div>
      <div class="decoration">🎊 🧧 🎊</div>
      <p>{{ wishes[currentWishIndex] }}</p>
      <div class="lanterns">
        <span>🏮</span>
        <span>🏮</span>
        <span>🏮</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isAnimating = ref(false)
const currentWishIndex = ref(0)
const wishes = [
  "Chúc năm mới sức khỏe dồi dào, công việc thuận lợi!",
  "Chúc một năm mới tràn đầy niềm vui và hạnh phúc!",
  "Năm mới phát tài phát lộc!",
  "An khang thịnh vượng, vạn sự như ý!"
]

const toggleAnimation = () => {
  isAnimating.value = true
  currentWishIndex.value = (currentWishIndex.value + 1) % wishes.length
  setTimeout(() => {
    isAnimating.value = false
  }, 1000)
}

const countdown = ref({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
});

const targetDate = new Date('2025-01-25T00:00:00+07:00'); 

const updateCountdown = () => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    countdown.value = { days: '00', hours: '00', minutes: '00', seconds: '00' };
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  countdown.value = {
    days: days.toString().padStart(2, '0'),
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0')
  };
};

let timer: number;

onMounted(() => {
  updateCountdown();
  timer = window.setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.95) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path fill="%23ffd700" opacity="0.1" d="M40,0L80,40L40,80L0,40Z"/></svg>');
  border-radius: 20px;
  padding: clamp(1.5rem, 5vw, 3rem);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15),
              0 8px 32px rgba(231, 76, 60, 0.2),
              0 0 15px rgba(255, 215, 0, 0.3);
  text-align: center;
  cursor: pointer;
  width: clamp(300px, 90vw, 600px);
  margin: 1rem;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 3px solid #ffd700;
}

.card-content {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-content.animate {
  transform: scale(1.05);
}

h1 {
  background: linear-gradient(45deg, #e74c3c, #ffd700);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: clamp(1.8rem, 5vw, 3rem);
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  font-family: 'Charm', cursive;
  letter-spacing: 1px;
  font-weight: 700;
}

.decoration {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  margin: 1rem 0;
  animation: floatUpDown 3s ease-in-out infinite;
}

p {
  font-size: clamp(1rem, 3vw, 1.4rem);
  color: #2c3e50;
  margin: 1.5rem 0;
  line-height: 1.6;
  padding: 0 clamp(0.5rem, 2vw, 2rem);
}

.lanterns {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.lanterns span {
  animation: swing 3s infinite ease-in-out;
}

.lanterns span:nth-child(2) {
  animation-delay: 0.5s;
}

.lanterns span:nth-child(3) {
  animation-delay: 1s;
}

.fireworks {
  position: absolute;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  animation: sparkle 2s infinite;
  opacity: 0.8;
}

@keyframes swing {
  0%, 100% { transform: rotate(-10deg) translateY(0); }
  50% { transform: rotate(10deg) translateY(-5px); }
}

@keyframes sparkle {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes floatUpDown {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@media (max-width: 480px) {
  .card {
    margin: 0.5rem;
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .card:hover {
    transform: translateY(-5px);
    transition: transform 0.3s ease;
  }

  .card:active {
    transform: translateY(0);
  }
}

.countdown {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 1rem 0;
  background: rgba(255, 215, 0, 0.1);
  padding: 15px;
  border-radius: 15px;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
}

.time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.number {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: bold;
  color: #e74c3c;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  font-family: 'Digital', monospace;
  background: linear-gradient(45deg, #ffd700, #e74c3c);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.label {
  font-size: clamp(0.8rem, 2vw, 1rem);
  color: #666;
  margin-top: 5px;
}

@media (max-width: 480px) {
  .countdown {
    gap: 10px;
    padding: 10px;
  }

  .time-block {
    min-width: 45px;
  }
}
</style>
