<template>
  <button class="gps-button" @click="handleGpsClick">
    <img src="/public/assets/GPS.png" alt="GPS" class="gps-icon">
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'GpsButton',
  emits: ['location'],
  setup(_, { emit }) {
    const handleGpsClick = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            emit('location', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          },
          (error) => {
            console.error('Error getting location:', error)
            alert('Unable to get your location')
          }
        )
      } else {
        alert('GPS not supported in your browser')
      }
    }

    return {
      handleGpsClick
    }
  }
})
</script>

<style scoped>
.gps-button {
  position: fixed;
  bottom: 20px;
  right: 23px;
  z-index: 1000;
  padding: 13px;
  border-radius: 50%;
  border: none;
  margin: 5px;
  background: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  cursor: pointer;
}

.gps-icon {
  width: 26px;
  height: 26px;
  display: block;
}
</style>
