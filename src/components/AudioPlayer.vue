<template>
  <div class="audio-player" :class="{ 'playing': isPlaying }">
    <div class="song-info">
      <span class="music-icon">🎵</span>
      <div class="song-name-container">
        <span class="song-name" :class="{ 'marquee': shouldMarquee }">
          {{ songs[currentSongIndex].name }}
        </span>
      </div>
    </div>
    <div class="controls">
      <button @click="togglePlay" :class="{ playing: isPlaying }" class="control-btn play-btn">
        {{ isPlaying ? '🎧' : '▶️' }}
      </button>
      <button @click="nextSong" class="control-btn next-btn">
        🔄
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const songs = [
  { name: "1.1.2024", path: "../src/assets/music/music.mp3" },
  { name: "VẠN NIÊN TƯ", path: "../src/assets/music/music2.mp3" },
  { name: "TẾT ĐONG ĐẦY", path: "../src/assets/music/music3.mp3" }
];

const currentSongIndex = ref(0);
const audio = new Audio(songs[0].path);
const isPlaying = ref(false);
const shouldMarquee = ref(false);
const autoPlayTimeout = ref<number | null>(null);

const isMobile = window.innerWidth <= 768;

const togglePlay = () => {
  if (isPlaying.value) {
    audio.pause();
  } else {
    playAudio();
  }
  isPlaying.value = !isPlaying.value;
}

const playAudio = async () => {
  try {
    await audio.play();
    isPlaying.value = true;
  } catch (err) {
    console.log('Auto-play prevented. User interaction needed.');

    autoPlayTimeout.value = window.setTimeout(playAudio, 1000);
  }
}

const nextSong = () => {
  currentSongIndex.value = (currentSongIndex.value + 1) % songs.length;
  audio.src = songs[currentSongIndex.value].path;
  if (isPlaying.value) {
    playAudio();
  }
  setTimeout(checkTextOverflow, 0);
}

const checkTextOverflow = () => {
  const songNameEl = document.querySelector('.song-name') as HTMLElement;
  const containerEl = document.querySelector('.song-name-container') as HTMLElement;
  if (songNameEl && containerEl) {
    shouldMarquee.value = songNameEl.offsetWidth > containerEl.offsetWidth;
  }
};

onMounted(() => {
  checkTextOverflow();
  
  if (!isMobile) {
    playAudio();
  }
});

onUnmounted(() => {
  if (autoPlayTimeout.value) {
    clearTimeout(autoPlayTimeout.value);
  }
  audio.pause();
  audio.removeEventListener('ended', nextSong);
});

audio.addEventListener('ended', () => {
  nextSong();
  audio.play();
});
</script>

<style scoped>
.audio-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #ffd700;
  border-radius: 20px;
  padding: 10px;
}

.audio-player:hover {
  transform: translateY(-5px);
}

.song-info {
  max-width: 120px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 15px;
  border-radius: 15px;
  margin-bottom: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.music-icon {
  font-size: 16px;
  animation: bounce 2s infinite;
  filter: drop-shadow(0 0 5px #ffd700);
}

.song-name-container {
  overflow: hidden;
  white-space: nowrap;
  width: 150px;
}

.song-name {
  display: inline-block;
  white-space: nowrap;
}

.marquee {
  animation: marquee 10s linear infinite;
  padding-right: 50px;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

.song-name {
  font-weight: 600;
  color: #e74c3c;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.control-btn {
  font-size: 22px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(145deg, #ffd700, #e74c3c);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 5px 5px 10px #d9d9d9,
              -5px -5px 10px #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.control-btn:hover {
  transform: scale(1.1);
  background: linear-gradient(145deg, #f0f0f0, #ffffff);
}

.control-btn:active {
  transform: scale(0.95);
  box-shadow: inset 5px 5px 10px #d9d9d9,
              inset -5px -5px 10px #ffffff;
}

.playing {
  animation: glow 2s infinite;
  background: linear-gradient(145deg, #e74c3c, #ffd700);
  color: white;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px #ff6b6b; }
  50% { box-shadow: 0 0 20px #ff6b6b; }
}

@media (max-width: 768px) {
  .audio-player {
    bottom: 75px; 
    right: 10px;
    padding: 8px;
    transform: scale(0.9);
    border-width: 1px;
  }

  .song-info {
    max-width: 100px;
    padding: 5px 10px;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .controls {
    gap: 8px;
  }

  .control-btn {
    width: 35px;
    height: 35px;
    font-size: 16px;
  }

  .music-icon {
    font-size: 14px;
  }

  .song-name {
    font-size: 0.8rem;
  }

  .audio-player:not(:hover):not(.playing) {
    opacity: 0.7;
    transform: scale(0.8);
  }

  .audio-player:hover,
  .audio-player.playing {
    opacity: 1;
    transform: scale(0.9);
  }

  .song-name.marquee {
    animation: marquee 8s linear infinite;
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-80%); }
  }
}

.audio-player.playing {
  border-color: #e74c3c;
  box-shadow: 0 0 15px rgba(231, 76, 60, 0.3);
}
</style>

