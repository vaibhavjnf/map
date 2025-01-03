<template>
    <div class="map-options">
      <button class="toggle-btn" @click="toggleMenu">
        <span class="material-icons">{{ isOpen ? 'close' : 'layers' }}</span>
      </button>
      <div class="map-style-buttons" :class="{ 'is-open': isOpen }">
        <div class="style-container">
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
        <div class="control-divider"></div>
        <label class="control-toggle">
          <input 
            type="checkbox" 
            v-model="showTraffic" 
            @change="toggleTraffic"
          >
          <span class="material-icons">traffic</span>
          <span class="control-label">Traffic</span>
        </label>
        <div v-if="showConfirm" class="style-confirm">
          <div class="confirm-message">
            <span class="material-icons">save</span>
            <p>Set this as your default map style?</p>
          </div>
          <div class="confirm-actions">
            <button @click="saveAsDefault">Yes</button>
            <button @click="showConfirm = false">No</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, watch, onMounted } from 'vue'
  import { activeMenu, setActiveMenu } from '../utils/menuState'
  
  export default defineComponent({
    name: 'MapOptions',
    emits: ['update-style', 'toggle-traffic'],
    setup(_, { emit }) {
      const isOpen = ref(false)
      
      watch(activeMenu, (newMenu) => {
        isOpen.value = newMenu === 'options'
      })
  
      const toggleMenu = () => {
        if (isOpen.value) {
          setActiveMenu(null)
        } else {
          setActiveMenu('options')
        }
      }
      
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
  
      const showConfirm = ref(false)
      const pendingStyle = ref('')

      onMounted(() => {
        const savedStyle = localStorage.getItem('defaultMapStyle')
        if (savedStyle) {
          selectedStyle.value = savedStyle
        }
      })

      const initialLoad = ref(true)
      
      const changeMapStyle = (style: string) => {
        if (initialLoad.value) {
          selectedStyle.value = style
          emit('update-style', style)
          initialLoad.value = false
          return
        }

        if (style !== selectedStyle.value) {
          pendingStyle.value = style
          showConfirm.value = true
        }
      }

      const saveAsDefault = () => {
        selectedStyle.value = pendingStyle.value
        emit('update-style', pendingStyle.value)
        localStorage.setItem('defaultMapStyle', pendingStyle.value)
        showConfirm.value = false
      }

      onMounted(() => {
        const savedStyle = localStorage.getItem('defaultMapStyle')
        if (savedStyle) {
          selectedStyle.value = savedStyle
          emit('update-style', savedStyle)
        }
      })

      const showTraffic = ref(false)

      const toggleTraffic = () => {
        emit('toggle-traffic', showTraffic.value)
      }
  
      return {
        isOpen,
        selectedStyle,
        mapStyles,
        changeMapStyle,
        showTraffic,
        toggleTraffic,
        toggleMenu,
        showConfirm,
        saveAsDefault
      }
    }
  })
  </script>
<style scoped>
@import '../styles/MapOptions.css';
</style>
