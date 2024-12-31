<script setup lang="ts">
import GreetingCard from './components/GreetingCard.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import FireworksEffect from './components/FireworksEffect.vue'
import LuckyMoney from './components/LuckyMoney.vue'
import PeachBlossoms from './components/PeachBlossoms.vue'
import SocialShare from './components/SocialShare.vue'
import { ref, onMounted } from 'vue'
const isMobile = ref(false)

onMounted(() => {
  isMobile.value = window.innerWidth <= 768
})
</script>

<template>
  <main class="tet-app">
    <Suspense>
      <template #default>
        <div>
          <FireworksEffect v-if="!isMobile" :launchSpeed="2" :sparkDensity="1.5" />
          <PeachBlossoms />
          <LuckyMoney />
          <greeting-card />
          <AudioPlayer />
          <SocialShare />
        </div>
      </template>
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  </main>
</template>

<style>
.tet-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #e74c3c 0%, #ff9b11 100%),
              url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="%23ffd700" stroke-width="0.5"/></svg>') !important;
  background-blend-mode: overlay;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  transition: transform 0.3s;
}
.tet-app:hover {
  transform: scale(1.02);
}

.tet-app::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;

  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, transparent 90%, rgba(231, 76, 60, 0.2));
  pointer-events: none;
}
</style>
