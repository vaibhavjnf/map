<template>
  <div class="explore-container" v-if="currentLocation">
    <button class="explore-toggle" @click="toggleMenu">
      <span class="material-icons">{{ isOpen ? 'close' : 'explore' }}</span>
    </button>
    
    <div class="explore-menu" :class="{ 'is-open': isOpen }">
      <h3>Explore Nearby</h3>
      
      <div class="categories">
        <button 
          v-for="category in categories" 
          :key="category.value"
          :class="['category-btn', { active: selectedCategory === category.value }]"
          @click="selectCategory(category.value)"
        >
          <span class="material-icons">{{ category.icon }}</span>
          {{ category.label }}
        </button>
      </div>

      <div class="controls">
        <div class="radius-control">
          <label>Range: {{ searchRadius }}m</label>
          <input 
            type="range" 
            v-model="searchRadius" 
            min="500" 
            max="5000" 
            step="500"
          >
        </div>
        
        <button class="lucky-btn" @click="feelingLucky">
          <span class="material-icons">casino</span>
          I'm Feeling Lucky
        </button>
        
        <button class="search-btn" @click="searchNearby">
          <span class="material-icons">search</span>
          Search Area
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { activeMenu, setActiveMenu } from '../utils/menuState'
import { toast } from './Toast.vue'

export default defineComponent({
  name: 'ExploreNearby',
  emits: ['show-places', 'request-location'],
  setup(_, { emit }) {
    const isOpen = ref(false)
    const searchRadius = ref(1000)
    const selectedCategory = ref('')
    const currentLocation = ref<{ lat: number; lng: number } | null>(null)

    const categories = [
      { label: 'Food', value: 'restaurant', icon: 'restaurant' },
      { label: 'Cafe', value: 'cafe', icon: 'local_cafe' },
      { label: 'Shopping', value: 'shop', icon: 'shopping_cart' },
      { label: 'Cinema', value: 'cinema', icon: 'movie' },
      { label: 'Parks', value: 'leisure=park', icon: 'park' },
      { label: 'ATM', value: 'atm', icon: 'local_atm' },
      { label: 'Hospital', value: 'hospital', icon: 'local_hospital' },
      { label: 'Pharmacy', value: 'pharmacy', icon: 'local_pharmacy' }
    ]

    watch(activeMenu, (newMenu) => {
      isOpen.value = newMenu === 'explore'
    })

    const toggleMenu = () => {
      if (isOpen.value) {
        setActiveMenu(null)
      } else {
        setActiveMenu('explore')
      }
    }

    const selectCategory = (category: string) => {
      selectedCategory.value = category
    }

    const searchNearby = () => {
      if (!selectedCategory.value || !currentLocation.value) {
        toast.show('Please select a category first', 'info')
        return
      }
      
      emit('show-places', {
        category: selectedCategory.value,
        radius: searchRadius.value,
        random: false,
        center: currentLocation.value
      })
    }

    const feelingLucky = () => {
      if (!currentLocation.value) return
      
      const randomCategory = categories[Math.floor(Math.random() * categories.length)]
      emit('show-places', {
        category: randomCategory.value,
        radius: searchRadius.value,
        random: true,
        center: currentLocation.value
      })
    }

    const requestLocation = () => {
      emit('request-location')
    }

    return {
      isOpen,
      categories,
      selectedCategory,
      searchRadius,
      selectCategory,
      searchNearby,
      feelingLucky,
      currentLocation,
      requestLocation,
      toggleMenu
    }
  },
  methods: {
    updateLocation(location: { lat: number; lng: number }) {
      this.currentLocation = location
    }
  }
})
</script>

<style scoped>
.explore-container {
  position: fixed;
  bottom: 20px;
  right: 110px; 
  z-index: 1000;
  display: flex;
  width: 40px;
  height: 40px;
  flex-direction: row-reverse;
  align-items: flex-end;
  gap: 10px;
}

.explore-toggle {
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

.explore-toggle:hover {
  background: #f5f5f5;
}

.explore-toggle .material-icons {
  font-size: 20px;
  color: #555;
}

.explore-menu {
  position: absolute;
  right: 0;
  bottom: 50px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transform: scale(0.95) translateY(20px);
  transition: transform 0.3s ease, opacity 0.3s ease;
  width: 300px;
  opacity: 0;
  visibility: hidden;
}

.explore-menu.is-open {
  transform: scale(1) translateY(0); 
  opacity: 1;
  visibility: visible;
}

.explore-menu h3 {
  margin: 0 0 16px 0;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.categories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  min-height: 40px;
}

.categories::-webkit-scrollbar {
  width: 6px;
}

.categories::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.categories::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.categories::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.category-btn.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.category-btn.active .material-icons {
  color: white;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radius-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radius-control label {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #444;
}

.radius-control input {
  width: 100%;
}

.search-btn, .lucky-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
}

.search-btn {
  background: #4CAF50;
  color: white;
}

.lucky-btn {
  background: #FF9800;
  color: white;
}

.search-btn:hover, .lucky-btn:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .explore-container {
    bottom: 20px;
    right: 60px;
    width: 40px;
    height: 40px;
  }

  .explore-menu {
    position: fixed;
    right: 10px;
    bottom: 70px;
    width: 75%; 
    max-width: 260px;
    max-height: 80vh;
    overflow-y: auto;
    transform: translateY(100%);
    left: 50%; 
    right: auto;
    transform: translate(-50%, 100%);
  }

  .explore-menu.is-open {
    transform: translate(-50%, 0);
  }

  .categories {
    gap: 6px; 
  }

  .category-btn {
    padding: 6px 10px;
    min-height: 36px; 
    font-size: 12px; 
  }
}
</style>
