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

      const location = {
        name: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      }

      emit('select-location', location)
      showResults.value = false
      searchQuery.value = location.name 
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
@import '../styles/search.css';
</style>
