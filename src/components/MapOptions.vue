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
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, watch } from 'vue'
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
  
      const changeMapStyle = (style: string) => {
        selectedStyle.value = style
        emit('update-style', style)
      }

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
        toggleMenu
      }
    }
  })
  </script>
  
  <style scoped>
  .map-options {
    position: fixed;
    bottom: 20px;
    right: 60px; 
    z-index: 1000;
    display: flex;
    flex-direction: row-reverse; 
    align-items: flex-end;
    gap: 10px;
  }
  
  .toggle-btn {
    position: relative; 
    background: white;
    border: none;
    border-radius: 4px;
    width: 40px;
    height: 40px; 
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    cursor: pointer;
    z-index: 1001;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    background: #f5f5f5;
  }
  
  .toggle-btn .material-icons {
    font-size: 20px;
    color: #555;
  }
  
  .map-style-buttons {
    position: absolute;
    right: 0;
    bottom: 50px;
    display: flex;
    flex-direction: column;
    background: white;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transform: scale(0.95) translateY(20px);
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    visibility: hidden;
    min-width: 280px;
  }
  
  .map-style-buttons.is-open {
    transform: scale(1) translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .style-container {
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
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
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #444;
  }
  
  .style-btn:hover {
    background: #f5f5f5;
  }
  
  .style-btn:hover .material-icons {
    color: #000;
  }

  .control-divider {
    height: 1px;
    background: #eee;
    margin: 8px 0;
    width: 100%;
  }

  .control-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .control-toggle:hover {
    background: #f5f5f5;
  }

  .control-toggle input {
    display: none;
  }

  .control-toggle input:checked + .material-icons {
    color: #4CAF50;
  }

  .control-toggle .material-icons {
    margin-bottom: 0;
    transition: color 0.2s ease;
  }

  .control-label {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #444;
  }

  @media (max-width: 768px) {
    .map-options {
      bottom: 20px;
      right: 110px; 
    }

    .map-style-buttons {
      position: fixed;
      bottom: 70px;
      right: 10px;
      width: 75%; 
      max-width: 260px;
      left: 50%;
      right: auto;
      transform: translate(-50%, 100%); 
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .map-style-buttons.is-open {
      transform: translate(-50%, 0);
      opacity: 1;
      visibility: visible;
    }

    .style-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px; 
    }

    .style-btn {
      min-height: 40px;
      width: 100%;
      flex-direction: row;
      justify-content: flex-start;
      padding: 6px 10px; 
      font-size: 12px;
    }

    .style-btn .material-icons {
      margin-bottom: 0;
      margin-right: 8px;
    }
  }
  </style>
