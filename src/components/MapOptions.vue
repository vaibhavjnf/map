<template>
  <div class="map-options">
    <button class="toggle-btn" @click="isOpen = !isOpen">
      <span class="material-icons">{{ isOpen ? 'close' : 'layers' }}</span>
    </button>
    <div class="map-style-buttons" :class="{ 'is-open': isOpen }">
      <button 
        v-for="style in mapStyles" 
        :key="style.value"
        class="style-btn"
        :class="{ active: selectedStyle === style.value }"
        @click="changeMapStyle(style.value)"
      >
        <span class="material-icons">{{ style.icon }}</span>
        <span class="style-label">{{ style.label }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'MapOptions',
  emits: ['update-style'],
  setup(_, { emit }) {
    const isOpen = ref(false)
    const selectedStyle = ref('alidade_smooth')
    
    const mapStyles = [
      { 
        label: 'Default', 
        value: 'alidade_smooth',
        icon: 'map'
      },
      { 
        label: 'Terrain', 
        value: 'stamen_terrain',
        icon: 'terrain'
      },
      { 
        label: 'Street', 
        value: 'osm_bright',
        icon: 'streetview'
      },
      { 
        label: 'Satellite', 
        value: 'alidade_satellite',
        icon: 'satellite'
      }
    ]

    const changeMapStyle = (style: string) => {
      selectedStyle.value = style
      emit('update-style', style)
    }

    return {
      isOpen,
      selectedStyle,
      mapStyles,
      changeMapStyle
    }
  }
})
</script>

<style scoped>
.map-options {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: row-reverse; 
  align-items: flex-start;
  gap: 10px;
}

.toggle-btn {
  position: relative; 
  background: white;
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  cursor: pointer;
  z-index: 1001;
}

.toggle-btn .material-icons {
  font-size: 20px;
  color: #555;
}

.map-style-buttons {
  position: relative; 
  display: flex;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transform: translateX(100%);
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0;
  visibility: hidden;
}

.map-style-buttons.is-open {
  transform: translateX(0);
  opacity: 1;
  visibility: visible;
}

.style-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.material-icons {
  font-size: 24px;
  color: #555;
  margin-bottom: 4px;
}

.style-btn.active {
  border-color: #4CAF50;
  background: #f0f9f0;
}

.style-btn.active .material-icons {
  color: #4CAF50;
}

.style-label {
  font-size: 12px;
  color: #666;
}

.style-btn:hover {
  background: #f5f5f5;
}

.style-btn:hover .material-icons {
  color: #000;
}
</style>
