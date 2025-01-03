<template>
  <div class="explore-container">

    <button class="explore-fab" @click="toggleMenu">
      <span class="material-icons">explore</span>
    </button>

    <div class="bottom-sheet" :class="{ 'is-open': isOpen }">
      <div class="bottom-sheet-backdrop" @click="toggleMenu"></div>
      <div 
        class="bottom-sheet-container" 
        @touchstart="handleStart"
        @touchmove="handleMove"
        @touchend="handleEnd"
        @mousedown="handleStart"
        @mousemove="handleMove"
        @mouseup="handleEnd"
        @mouseleave="handleEnd"
      >
        <div class="sheet-header">
          <div class="handle-bar"></div>
          <h2>Explore Nearby</h2>
          <!-- Thêm nút đóng cho PC -->
          <button v-if="!isMobile" class="close-button" @click="toggleMenu">
            <span class="material-icons">close</span>
          </button>
        </div>

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
    const isMobile = ref(window.innerWidth < 768)
    
    window.addEventListener('resize', () => {
      isMobile.value = window.innerWidth < 768
    })

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

    const feelingLucky = async () => {
      if (!currentLocation.value) {
        toast.show('Please enable location services first', 'info')
        return
      }
      
      try {
        isSearching.value = true
        const randomCategory = categories[Math.floor(Math.random() * categories.length)]
        const center = L.latLng(currentLocation.value.lat, currentLocation.value.lng)
        
        const query = generateQuery(randomCategory.value, searchRadius.value, center)
        
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
          toast.show('No places found, trying another category...', 'info')
          // Thử lại với category khác
          feelingLucky()
          return
        }

        setActiveMenu(null)
        emit('show-places', {
          results,
          category: randomCategory.value,
          radius: searchRadius.value, 
          random: true,
          center: currentLocation.value
        })

      } catch (error) {
        console.error('Lucky search error:', error)
        toast.show('Error searching places', 'error')
      } finally {
        isSearching.value = false
      }
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

    let touchStartY = 0;
    let touchMoveY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobile.value) return
      touchStartY = e.touches[0].clientY;
      touchMoveY = touchStartY;
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobile.value) return
      touchMoveY = e.touches[0].clientY;
      const deltaY = touchMoveY - touchStartY;
      
      if (deltaY > 0) { 
        e.preventDefault();
        const container = e.currentTarget as HTMLElement;
        container.style.transform = `translateY(${deltaY}px)`;
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isMobile.value) return
      const deltaY = touchMoveY - touchStartY;
      const container = e.currentTarget as HTMLElement;
      container.style.transform = '';
      
      if (deltaY > 100) { 
        toggleMenu();
      }
    }

    let startY = 0;
    let moveY = 0;
    let isDragging = false;

    const handleStart = (e: TouchEvent | MouseEvent) => {
      if (!isMobile.value) return;
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      moveY = startY;
    }

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!isMobile.value || !isDragging) return;
      moveY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = moveY - startY;
      
      if (deltaY > 0) {
        e.preventDefault();
        const container = e.currentTarget as HTMLElement;
        container.style.transform = `translateY(${deltaY}px)`;
      }
    }

    const handleEnd = (e: TouchEvent | MouseEvent) => {
      if (!isMobile.value || !isDragging) return;
      isDragging = false;
      const deltaY = moveY - startY;
      const container = e.currentTarget as HTMLElement;
      container.style.transform = '';
      
      if (deltaY > 100) {
        toggleMenu();
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
      updateLocation,
      showRadiusSelect,
      toggleRadiusSelect,
      radiusOptions,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      isMobile,
      handleStart,
      handleMove, 
      handleEnd
    }
  }
})
</script>
<style scoped>
@import '../styles/nearby.css';
</style>
