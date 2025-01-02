<template>
    <div class="explore-container" v-if="currentLocation">
      <button class="explore-toggle" @click="toggleMenu">
        <span class="material-icons">{{ isOpen ? 'close' : 'explore' }}</span>
      </button>
      
      <div class="explore-menu" :class="{ 'is-open': isOpen }">
        <h3>Explore Nearby</h3>
        
        <div class="radius-info">
          Current range: <span class="radius-value">{{ formatRadius(searchRadius) }}</span>
        </div>
        
        <div class="categories" :class="{ 'is-searching': isSearching }">
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

        <div class="search-overlay" v-if="isSearching">
          <div class="search-spinner">
            <span class="material-icons rotating">explore</span>
            <span>Searching nearby places...</span>
          </div>
        </div>
  
        <div class="controls">
          <div class="radius-control">
            <label>Range: {{ searchRadius }}m</label>
            <input 
              type="range" 
              v-model="searchRadius" 
              min="500" 
              max="2000" 
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
import L, { type LatLng } from 'leaflet' // Import L để tạo LatLng object

// Cache kết quả tìm kiếm địa điểm
const placesCache = new Map<string, any[]>()
const CACHE_DURATION = 1000 * 60 * 10 // 10 phút

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

    watch(activeMenu, (newMenu) => {
      isOpen.value = newMenu === 'explore'
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
        
        // Chỉ sử dụng Overpass API để đảm bảo độ chính xác
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
      // Cập nhật ngay lập tức và đồng bộ
      currentLocation.value = location
      
      // Nếu đang tìm kiếm, thực hiện tìm kiếm lại với vị trí mới
      if (selectedCategory.value && isOpen.value) {
        searchNearby()
      }
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
      updateLocation
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
  transform: translateZ(0);
  will-change: transform;
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
  transition: transform 0.2s ease, opacity 0.2s ease;
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

.radius-info {
  margin: -12px 0 12px;
  font-size: 12px;
  color: #666;
  font-family: 'Inter', sans-serif;
}

.radius-value {
  color: #4CAF50;
  font-weight: 600;
}

.categories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: none; 
  -ms-overflow-style: none; 
}

.categories::-webkit-scrollbar {
  display: none; 
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
  position: relative;
}

.categories::-webkit-scrollbar {
  display: none;
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
  background: #f8f9fa;
  border-radius: 8px;
}

.radius-control label {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #444;
  display: none; 
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

.category-btn:active,
.search-btn:active,
.lucky-btn:active {
  transform: none;
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
    grid-template-columns: 1fr 1fr; 
    gap: 6px;
    scrollbar-width: none;
    -ms-overflow-style: none; 
  }

  .categories::-webkit-scrollbar {
    display: none; 
  }

  .category-btn {
    padding: 6px 8px;
    font-size: 12px;
  }

  .category-btn .material-icons {
    font-size: 18px;
  }
  
  .controls {
    gap: 8px;
  }

  .radius-info {
    text-align: center;
    margin: -8px 0 10px;
  }
}

/* Thêm styles mới cho categories */
.category-btn.active {
  border-color: #4CAF50;
  background-color: #f0f9f0;
}

.category-btn.active .material-icons {
  color: #4CAF50;
}

.category-btn::after {
  display: none;
}

.category-btn:hover::after {
  display: none;
}

.category-btn:active::after {
  display: none;
}

.category-btn:hover {
  background-color: #f5f5f5;
  border-color: #ddd;
}

.search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  z-index: 1002;
}

.search-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: white;
  font-family: 'Inter', sans-serif;
}

.search-spinner .material-icons {
  font-size: 32px;
  animation: spin 2s linear infinite;
}

.categories.is-searching {
  filter: blur(2px);
  pointer-events: none;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Màu sắc khác nhau cho từng nguồn */
:deep(.place-marker.overpass) .material-icons {
  color: #7EBC6F;
}

:deep(.place-marker.nominatim) .material-icons {
  color: #FF5722;
}

:deep(.place-marker.photon) .material-icons {
  color: #2196F3;
}
</style>
