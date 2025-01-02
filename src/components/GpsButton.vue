<template>
  <button class="gps-button" @click="handleGpsClick">
    <span class="material-icons">my_location</span>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { toast } from './Toast.vue'

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
            toast.show('Location updated', 'success')
          },
          (error) => {
            console.error('Error getting location:', error)
            toast.show('Unable to get your location', 'error')
          }
        )
      } else {
        toast.show('GPS not supported in your browser', 'error')
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
  right: 10px; 
  z-index: 1000;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: none;
  background: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.gps-button:hover {
  background: #f5f5f5;
}

.gps-button .material-icons {
  font-size: 20px;
  color: #555;
}

@media (max-width: 768px) {
  .gps-button {
    right: 60px; /* Di chuyển nút GPS lại gần với MapOptions */
    bottom: 20px;
  }
}
</style>
