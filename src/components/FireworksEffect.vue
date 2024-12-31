<template>
  <div class="fireworks-container" ref="fireworksContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Fireworks } from 'fireworks-js';

const fireworksContainer = ref<HTMLElement | null>(null);
let fireworks: Fireworks;

const colors = {
  red: ['#ff0000', '#ff4444', '#ff8888'],
  gold: ['#ffd700', '#ffed4a', '#fff4b0'],
  rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff']
};

onMounted(() => {
  if (!fireworksContainer.value) return;

  fireworks = new Fireworks(fireworksContainer.value, {
    speed: 4,
    acceleration: 1.05,
    friction: 0.95,
    gravity: 1,
    particles: 100,
    trace: 10,
    explosion: 8,
    mouse: {
      click: true,
      move: false,
      max: 3
    },
    boundaries: {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight
    },
    sound: false,
    colors: [...colors.red, ...colors.gold],
    rocketsPoint: {
      min: 0,
      max: 100
    },
    intensity: 25
  });

  fireworks.start();
});

onUnmounted(() => {
  if (fireworks) {
    fireworks.stop();
  }
});
</script>

<style scoped>
.fireworks-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
</style>
