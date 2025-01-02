<template>
  <div class="explore-container">
    <!-- Trigger Button -->
    <button class="explore-fab" :class="{ 'is-hidden': isOpen }" @click="toggleMenu">
      <span class="material-icons">explore</span>
    </button>

    <!-- Bottom Sheet -->
    <div class="bottom-sheet" :class="{ 'is-open': isOpen }">
      <div class="bottom-sheet-backdrop" @click="toggleMenu"></div>
      <div class="bottom-sheet-container">
        <!-- Handle & Header -->
        <div class="sheet-header">
          <div class="handle-bar"></div>
          <button class="close-button" @click="toggleMenu">
            <span class="material-icons">close</span>
          </button>
          <h2>Explore Nearby</h2>
        </div>

        <!-- Search Radius -->
        <div class="radius-section">
          <div class="radius-header">
            <span class="material-icons">radio_button_checked</span>
            <span>Search Radius</span>
          </div>
          <div class="radius-buttons">
            <button 
              v-for="radius in radiusOptions" 
              :key="radius.value"
              :class="['radius-btn', { active: searchRadius === radius.value }]"
              @click="searchRadius = radius.value"
            >
              {{ radius.label }}
            </button>
          </div>
        </div>

        <!-- Categories Grid -->
        <div class="categories-section" :class="{ 'is-searching': isSearching }">
          <h3>Select Category</h3>
          <div class="categories-grid">
            <button 
              v-for="category in categories" 
              :key="category.value"
              :class="['category-tile', { active: selectedCategory === category.value }]"
              @click="selectCategory(category.value)"
            >
              <span class="material-icons">{{ category.icon }}</span>
              <span>{{ category.label }}</span>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="search-btn primary" @click="searchNearby">
            <span class="material-icons">search</span>
            Search Area
          </button>
          <button class="lucky-btn secondary" @click="feelingLucky">
            <span class="material-icons">casino</span>
            I'm Feeling Lucky
          </button>
        </div>

        <!-- Loading Overlay -->
        <div class="loading-overlay" v-if="isSearching">
          <div class="loading-spinner">
            <span class="material-icons rotating">explore</span>
            <div class="loading-text">
              <span>Searching nearby...</span>
              <span class="dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { activeMenu, setActiveMenu } from '../utils/menuState'
import { toast } from './Toast.vue'
import L, { type LatLng } from 'leaflet' 

const placesCache = new Map<string, any[]>()
const CACHE_DURATION = 1000 * 60 * 10 

export default defineComponent({
  name: 'ExploreNearby',
  emits: ['show-places', 'request-location'],
  setup(_, { emit }) {
    const isOpen = ref(false)
    const searchRadius = ref(500)
    const selectedCategory = ref('')
    const currentLocation = ref<{ lat: number; lng: number } | null>(null)
    const lastSearch = ref<{category: string, radius: number} | null>(null)
    const isSearching = ref(false)
    const showRadiusSelect = ref(false)

    const categories = [
      { label: 'Restaurant', value: 'amenity=restaurant', icon: 'restaurant' },
      { label: 'Cafe', value: 'amenity=cafe', icon: 'local_cafe' },
      { label: 'Supermarket', value: 'shop=supermarket', icon: 'shopping_cart' },
      { label: 'School', value: 'amenity=school', icon: 'school' },
      { label: 'Hospital', value: 'amenity=hospital', icon: 'local_hospital' },
      { label: 'Bank', value: 'amenity=bank', icon: 'account_balance' },
      { label: 'Gas Station', value: 'amenity=fuel', icon: 'local_gas_station' },
      { label: 'Park', value: 'leisure=park', icon: 'park' },
      { label: 'Pharmacy', value: 'amenity=pharmacy', icon: 'local_pharmacy' },
      { label: 'ATM', value: 'amenity=atm', icon: 'local_atm' }
    ]

    const radiusOptions = [
      { value: 500, label: '500m' },
      { value: 1000, label: '1km' },
      { value: 2000, label: '2km' },
      { value: 5000, label: '5km' },
    ]

    watch(activeMenu, (newMenu) => {
      isOpen.value = newMenu === 'explore'
    })

    watch(isOpen, (newValue) => {
      document.body.classList.toggle('explore-open', newValue)
    })

    const toggleMenu = () => {
      if (isOpen.value) {
        setActiveMenu(null)
      } else {
        setActiveMenu('explore')
        if (lastSearch.value) {
          selectedCategory.value = lastSearch.value.category
          searchRadius.value = lastSearch.value.radius
        }
      }
    }

    const selectCategory = (category: string) => {
      selectedCategory.value = category
    }

    const generateQuery = (category: string, radius: number, center: LatLng) => {
      const [key, value] = category.split('=') 
      return `[out:json][timeout:25];
        (
          node["${key}"="${value}"](around:${radius},${center.lat},${center.lng});
          way["${key}"="${value}"](around:${radius},${center.lat},${center.lng});
          relation["${key}"="${value}"](around:${radius},${center.lat},${center.lng});
        );
        out body;
        >;
        out skel qt;`
    }

    const searchNearby = async () => {
      if (!selectedCategory.value || !currentLocation.value) {
        toast.show('Please select a category first', 'info')
        return
      }

      try {
        isSearching.value = true
        const center = L.latLng(currentLocation.value.lat, currentLocation.value.lng)
        
        const query = generateQuery(selectedCategory.value, searchRadius.value, center)
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        if (!response.ok) throw new Error('Network response was not ok')
        
        const data = await response.json()
        const results = data.elements
          .filter((place: any) => place.tags && place.tags.name)
          .map((place: any) => ({
            name: place.tags.name,
            lat: place.lat || place.center?.lat,
            lng: place.lon || place.center?.lon,
            source: 'openstreetmap',
            details: place.tags
          }))

        if (results.length === 0) {
          toast.show('No places found in this area', 'info')
          return
        }

        setActiveMenu(null) 
        emit('show-places', {
          results,
          category: selectedCategory.value,
          radius: searchRadius.value,
          random: false,
          center: currentLocation.value
        })

      } catch (error) {
        console.error('Search error:', error)
        toast.show('Error searching places', 'error')
      } finally {
        isSearching.value = false
      }
    }

    const feelingLucky = () => {
      if (!currentLocation.value) return
      
      const randomCategory = categories[Math.floor(Math.random() * categories.length)]
      const center = L.latLng(currentLocation.value.lat, currentLocation.value.lng)

      emit('show-places', {
        category: randomCategory.value,
        radius: searchRadius.value,
        random: true,
        center: currentLocation.value
      })
    }

    const formatRadius = (meters: number): string => {
      return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
    }

    const updateLocation = (location: { lat: number; lng: number }) => {
  
      currentLocation.value = location
   
      if (selectedCategory.value && isOpen.value) {
        searchNearby()
      }
    }

    const toggleRadiusSelect = () => {
      showRadiusSelect.value = !showRadiusSelect.value
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
      toggleMenu,
      formatRadius,
      isSearching,
      updateLocation,
      showRadiusSelect,
      toggleRadiusSelect,
      radiusOptions
    }
  }
})
</script>

<style scoped>
.explore-fab {
  position: fixed;
  bottom: 24px;
  left: 24px; 
  width: 48px; 
  height: 48px;
  border-radius: 12px;
  background: #1A73E8;
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 1000;
  transform: translateZ(0); 
  backface-visibility: hidden; 
  will-change: transform; 
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.2s ease,
              opacity 0.2s ease,
              visibility 0.2s ease;
}

.explore-fab:hover {
  background: #1557B0;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.explore-fab.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  visibility: hidden;
  transition: visibility 0s linear 0.3s;
}

.bottom-sheet.is-open {
  visibility: visible;
  transition-delay: 0s;
}

.bottom-sheet-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.bottom-sheet.is-open .bottom-sheet-backdrop {
  opacity: 1;
}

.bottom-sheet-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 28px 28px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 12px 24px 0; 
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  scrollbar-width: none; 
  -ms-overflow-style: none; 
  font-family: 'Product Sans', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.bottom-sheet-container::-webkit-scrollbar {
  display: none;  
}

.bottom-sheet.is-open .bottom-sheet-container {
  transform: translateY(0);
}

.sheet-header {
  text-align: center;
  margin-bottom: 24px;
  position: relative;
}

.handle-bar {
  width: 32px;
  height: 4px;
  background: #E0E0E0;
  border-radius: 2px;
  margin: 8px auto 20px;
}

.sheet-header h2 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #1A73E8, #34A853);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.5px;
  font-family: 'Product Sans', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.close-button {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  z-index: 1;
}

.radius-section {
  background: #F8F9FA;
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.radius-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #5F6368;
  font-size: 14px;
}

.radius-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.radius-btn {
  padding: 8px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.radius-btn.active {
  background: #E8F0FE;
  border-color: #1A73E8;
  color: #1A73E8;
}

.radius-slider,
.radius-slider::-webkit-slider-thumb {
  display: none;
}

.categories-section {
  margin-bottom: 24px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.categories-section::-webkit-scrollbar {
  display: none;
}

.categories-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.category-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 12px;
  border-radius: 16px;
  background: white;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.category-tile .material-icons {
  font-size: 28px;
  color: #5F6368;
  margin-bottom: 4px;
}

.category-tile span:not(.material-icons) {
  font-size: 13px;
  font-weight: 500;
  color: #202124;
}

.category-tile.active {
  background: #E8F0FE;
  border-color: #1A73E8;
  box-shadow: 0 2px 8px rgba(26,115,232,0.15);
}

.category-tile.active .material-icons {
  color: #1A73E8;
}

.category-tile.active span:not(.material-icons) {
  color: #1A73E8;
  font-weight: 600;
}

.category-tile::before,
.category-tile:hover::before {
  display: none;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-buttons button {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.primary {
  background: #1A73E8;
  color: white;
}

.secondary {
  background: #F8F9FA;
  color: #1A73E8;
  border: 1px solid #1A73E8;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1003;
  backdrop-filter: blur(8px);
  font-family: 'Product Sans', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner .material-icons {
  font-size: 48px;
  color: #1A73E8;
  filter: drop-shadow(0 4px 8px rgba(26, 115, 232, 0.2));
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #202124;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dots span {
  animation: dots 1.4s infinite;
  opacity: 0;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dots {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes spin {
  to { 
    transform: rotate(360deg);
  }
}

.rotating {
  animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@media (max-width: 767px) {
  .bottom-sheet-container {
    height: 100%;
    padding: 12px 24px 0;
    overflow: hidden;
  }

  .categories-section {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 100px; 
    -webkit-overflow-scrolling: touch;
  }

  .action-buttons {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 16px 24px calc(16px + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
    margin: 0;
    z-index: 1002;
  }

  .action-buttons::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to top, white, transparent);
    pointer-events: none;
  }

  .explore-fab {
    bottom: auto; 
    top: 80px; 
    left: 24px;
    z-index: 1001;
    transform: translateZ(0); 
    contain: layout style paint; 
  }

  .loading-overlay {
    position: fixed;
    inset: 0;
    border-radius: 28px 28px 0 0;
  }
}

@media (min-width: 768px) {

  .explore-fab {
    bottom: 24px;
    left: 24px;
  }

  .bottom-sheet-container {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    bottom: auto;
    right: auto;
    width: 480px;
    max-height: 80vh;
    border-radius: 28px;
  }

  .bottom-sheet.is-open .bottom-sheet-container {
    transform: translate(-50%, -50%) scale(1);
  }

  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .radius-buttons {
    grid-template-columns: repeat(4, 1fr);
  }

  .action-buttons {
    margin-top: auto;
    padding: 24px 0;
  }

  .action-buttons button {
    padding: 16px 32px;
    font-size: 15px;
  }

  .category-tile {
    padding: 20px 16px;
  }

  .category-tile .material-icons {
    font-size: 32px;
  }

  .category-tile span:not(.material-icons) {
    font-size: 14px;
  }

  .loading-overlay {
    border-radius: 28px;
  }
}
</style>
