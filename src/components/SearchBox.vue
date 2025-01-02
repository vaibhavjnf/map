<template>
  <div class="search-container">
    <div class="search-box">
      <input
        type="text"
        v-model="searchQuery"
        @input="handleInput"
        @focus="showResults = true"
        @blur="handleBlur"
        @keydown.down.prevent="navigateResults(1)"
        @keydown.up.prevent="navigateResults(-1)"
        @keydown.enter.prevent="selectHighlighted"
        :placeholder="useCurrentLocation && currentLocation ? 'Tìm quanh đây...' : 'Tìm kiếm địa điểm...'"
        class="search-input"
      />
      <button 
        v-if="currentLocation"
        class="location-toggle"
        @click="useCurrentLocation = !useCurrentLocation"
        :title="useCurrentLocation ? 'Đang tìm quanh đây' : 'Tìm ở mọi nơi'"
      >
        <span class="material-icons">
          {{ useCurrentLocation ? 'near_me' : 'public' }}
        </span>
      </button>
      <span class="material-icons search-icon">search</span>
    </div>
    <div v-if="showResults && results.length > 0" class="search-results">
      <div
        v-for="(result, index) in results"
        :key="result.place_id"
        :class="['result-item', { highlighted: index === highlightedIndex }]"
        @click="selectLocation(result)"
        @mouseover="highlightedIndex = index"
        ref="resultItems"
      >
        <span class="material-icons">location_on</span>
        <div class="result-info">
          <div class="result-text">{{ result.display_name }}</div>
          <div v-if="result.distance" class="result-distance">
            {{ formatDistance(result.distance) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, inject } from 'vue'
import debounce from 'lodash/debounce'
import L from 'leaflet'

// Tăng cache lên 30 phút
const CACHE_DURATION = 1000 * 60 * 30
const searchCache = new Map<string, any[]>()
const recentSearches = new Map<string, any>()
const MAX_RECENT = 5

// Khoảng cách tìm kiếm mặc định là 20km
const DEFAULT_SEARCH_RADIUS = 20000

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  distance?: number;
}

export default defineComponent({
  name: 'SearchBox',
  emits: ['select-location'],
  props: {
    currentLocation: {
      type: Object as () => { lat: number; lng: number } | null,
      default: null
    }
  },
  setup(props, { emit }) {
    const searchQuery = ref('')
    const results = ref<SearchResult[]>([])
    const showResults = ref(false)
    const highlightedIndex = ref(-1)
    const resultItems = ref<HTMLDivElement[]>([])
    const useCurrentLocation = ref(true) 

    const handleBlur = () => {
      setTimeout(() => {
        showResults.value = false
        highlightedIndex.value = -1
      }, 200)
    }

    const navigateResults = (direction: number) => {
      if (!results.value.length) return

      highlightedIndex.value += direction
      if (highlightedIndex.value >= results.value.length) {
        highlightedIndex.value = 0
      } else if (highlightedIndex.value < 0) {
        highlightedIndex.value = results.value.length - 1
      }

      nextTick(() => {
        const currentItem = resultItems.value[highlightedIndex.value]
        if (currentItem) {
          currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
    }

    const selectHighlighted = () => {
      if (highlightedIndex.value >= 0 && results.value[highlightedIndex.value]) {
        selectLocation(results.value[highlightedIndex.value])
      }
    }

    const searchLocation = async (query: string) => {
      if (query.length < 2) {
        results.value = []
        return
      }

      const cacheKey = query.toLowerCase().trim()
      const cachedResult = searchCache.get(cacheKey)
      if (cachedResult) {
        results.value = cachedResult
        return
      }

      try {
        let searchParams = new URLSearchParams({
          format: 'json',
          q: query,
          limit: '10',
          addressdetails: '1',
          namedetails: '1',
          dedupe: '1'
        })

        if (props.currentLocation && useCurrentLocation.value) {
          const bbox = calculateBoundingBox(
            props.currentLocation.lat,
            props.currentLocation.lng,
            DEFAULT_SEARCH_RADIUS
          )
          searchParams.append('viewbox', bbox)
          searchParams.append('bounded', '1')
        } else {
          searchParams.append('viewbox', '102.14,8.18,109.46,23.39')
          searchParams.append('countrycodes', 'vn')
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
          {
            headers: {
              'Accept-Language': 'vi'
            }
          }
        )

        if (!response.ok) throw new Error('Search failed')
        
        const data = await response.json()
        
        const optimizedResults = data
          .filter((item: any) => item.type !== 'administrative')
          .map((item: any) => ({
            place_id: item.place_id,
            display_name: formatDisplayName(item),
            lat: item.lat,
            lon: item.lon,
            distance: props.currentLocation ? 
              calculateDistance(
                props.currentLocation.lat,
                props.currentLocation.lng,
                parseFloat(item.lat),
                parseFloat(item.lon)
              ) : null
          }))
          .sort((a: any, b: any) => {
           
            if (a.distance && b.distance) {
              return a.distance - b.distance
            }
            return 0
          })
          .slice(0, 5)

        searchCache.set(cacheKey, optimizedResults)
        setTimeout(() => searchCache.delete(cacheKey), CACHE_DURATION)

        results.value = optimizedResults
      } catch (error) {
        console.error('Search error:', error)
        results.value = []
      }
    }

    const calculateBoundingBox = (lat: number, lon: number, radius: number) => {
      const R = 6371000 
      const latRad = (lat * Math.PI) / 180
      const lonRad = (lon * Math.PI) / 180
      const d = radius / R

      const minLat = ((lat - (d * 180) / Math.PI))
      const maxLat = ((lat + (d * 180) / Math.PI))
      const minLon = lon - (d * 180) / (Math.PI * Math.cos(latRad))
      const maxLon = lon + (d * 180) / (Math.PI * Math.cos(latRad))

      return `${minLon},${minLat},${maxLon},${maxLat}`
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      return L.latLng(lat1, lon1).distanceTo(L.latLng(lat2, lon2))
    }

    const formatDisplayName = (item: any) => {
      const parts = []
      if (item.namedetails?.name) parts.push(item.namedetails.name)
      if (item.address) {
        if (item.address.road || item.address.street) parts.push(item.address.road || item.address.street)
        if (item.address.suburb) parts.push(item.address.suburb)
        if (item.address.city || item.address.town) parts.push(item.address.city || item.address.town)
        if (item.address.state) parts.push(item.address.state)
      }
      return parts.length > 0 ? parts.join(', ') : item.display_name
    }

    const handleInput = debounce(() => {
      const query = searchQuery.value.trim()
      if (!query) {
        results.value = []
        return
      }
      searchLocation(query)
    }, 200) 

    const selectLocation = (result: SearchResult) => {
     
      const key = `${result.lat}-${result.lon}`
      recentSearches.set(key, result)
      
      if (recentSearches.size > MAX_RECENT) {
        const firstKey = recentSearches.keys().next().value
        if (firstKey !== undefined) {
          recentSearches.delete(firstKey)
        }
      }

      emit('select-location', {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        name: result.display_name
      })
      showResults.value = false
      searchQuery.value = ''
      results.value = []
    }

    const formatDistance = (distance: number) => {
      if (distance < 1000) return `${Math.round(distance)}m`
      return `${(distance / 1000).toFixed(1)}km`
    }

    return {
      searchQuery,
      results,
      showResults,
      handleInput,
      handleBlur,
      selectLocation,
      highlightedIndex,
      navigateResults,
      selectHighlighted,
      resultItems,
      useCurrentLocation,
      formatDistance
    }
  }
})
</script>

<style scoped>
.search-container {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 300px; 
  display: flex;
  align-items: center;
}

.search-box {
  width: 100%;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-box:hover,
.search-box:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transform: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #333;
  background: transparent;
  outline: none;
}

.search-input::placeholder {
  color: #999;
  font-weight: 400;
}

.search-icon {
  position: absolute;
  right: 12px;
  color: #666;
  font-size: 20px;
  transition: color 0.2s ease;
}

.search-box:focus-within .search-icon {
  color: #4CAF50;
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  margin-top: 5px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
  scrollbar-width: none;
  -ms-overflow-style: none;
  transform: translateZ(0);
  backface-visibility: hidden;
  contain: content;
}

.search-results::-webkit-scrollbar {
  display: none;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  contain: layout style;
  will-change: transform;
  translate: 0; 
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: rgba(76, 175, 80, 0.1);
}

.result-item .material-icons {
  margin-right: 12px;
  color: #4CAF50;
  font-size: 20px;
}

.result-item.highlighted {
  background: rgba(76, 175, 80, 0.1);
}

.result-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .search-container {
    top: 16px;
    width: 85%;
    max-width: 300px;
    left: 50%;
    transform: translateX(-50%);
  }

  .search-input {
    padding: 10px 36px 10px 14px;
    font-size: 13px;
  }

  .search-icon {
    right: 10px;
    font-size: 18px;
  }

  .search-results {
    max-height: 40vh;
    border-radius: 10px;
  }

  .result-item {
    padding: 10px 14px;
  }

  .result-item .material-icons {
    font-size: 18px;
    margin-right: 10px;
  }

  .result-text {
    font-size: 12px;
  }

  .result-item:active {
    background: rgba(76, 175, 80, 0.2);
  }
}

@supports not (backdrop-filter: blur(8px)) {
  .search-box,
  .search-results {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: none;
  }
}

.location-toggle {
  position: absolute;
  right: 40px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-toggle .material-icons {
  font-size: 18px;
  color: inherit;
}

.location-toggle:hover {
  color: #4CAF50;
}

.result-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.result-distance {
  font-size: 12px;
  color: #4CAF50;
  white-space: nowrap;
}
</style>