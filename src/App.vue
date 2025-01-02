<template>
  <MapView ref="mapView" />
  <SearchBox 
    :currentLocation="currentLocation" 
    @select-location="handleSearchSelect" 
  />
  <GpsButton @location="handleLocation" />
  <MapOptions 
    @update-style="handleStyleUpdate"
    @toggle-traffic="handleTrafficToggle"
  />
  <ExploreNearby 
    ref="exploreNearby"
    @show-places="handleShowPlaces"
    @request-location="handleGpsRequest" 
  />
  <ChatButton 
    @search-location="handleAISearch"
    @get-directions="handleAIDirections"
    @explore-category="handleAIExplore"
    @update-style="handleStyleUpdate"
    @toggle-traffic="handleTrafficToggle"
  />
  <Toast />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import MapView from './components/MapView.vue'
import GpsButton from './components/GpsButton.vue'
import MapOptions from './components/MapOptions.vue'
import SearchBox from './components/SearchBox.vue'
import ExploreNearby from './components/ExploreNearby.vue'
import Toast, { toast } from './components/Toast.vue'
import ChatButton from './components/ChatButton.vue'
import L from 'leaflet'
import { activeMenu } from './utils/menuState'
import { auth } from './utils/auth'

export default defineComponent({
  name: 'App',
  components: {
    MapView,
    GpsButton,
    MapOptions,
    SearchBox,
    ExploreNearby,
    Toast,
    ChatButton
  },
  setup() {
    const mapView = ref<InstanceType<typeof MapView> | null>(null)
    const exploreNearby = ref<InstanceType<typeof ExploreNearby> | null>(null)
    const currentLocation = ref<{ lat: number; lng: number } | null>(null)
    
    const handleLocation = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      currentLocation.value = { lat: latitude, lng: longitude }
      
      // Cập nhật vị trí ngay lập tức
      requestAnimationFrame(() => {
        // Cập nhật ExploreNearby trước
        exploreNearby.value?.updateLocation({ lat: latitude, lng: longitude })
        
        // Sau đó cập nhật map và marker
        mapView.value?.centerMap(latitude, longitude)
        mapView.value?.addMarker(latitude, longitude, 'You are here', 'gps')
      })
    }

    const handleGpsRequest = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            handleLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
            toast.show('Location services enabled!', 'success')
          },
          (error) => {
            console.error('Error getting location:', error)
            toast.show('Unable to get your location. Please enable location services.', 'error')
          }
        )
      } else {
        toast.show('GPS not supported in your browser', 'error')
      }
    }

    const handleStyleUpdate = (style: string) => {
      mapView.value?.updateMapStyle(style)
    }

    const handleSearchSelect = ({ latitude, longitude, name }: { 
      latitude: number; 
      longitude: number;
      name: string;
    }) => {
      mapView.value?.centerMap(latitude, longitude)
      mapView.value?.addMarker(latitude, longitude, name, 'search')
    }

    const handleTrafficToggle = (show: boolean) => {
      mapView.value?.toggleTraffic(show)
    }

    const handleShowPlaces = ({ category, radius, random, center, results }: { 
      category: string;
      radius: number;
      random: boolean;
      center: { lat: number; lng: number };
      results: any[];
    }) => {
      if (mapView.value) {
        mapView.value.showNearbyPlaces({
          results,
          center: L.latLng(center.lat, center.lng),
          category,
          radius,
          random
        })
      }
    }

    const handleAISearch = (location: string) => {
      // Trigger search box with AI suggested location
      const searchBox = document.querySelector('.search-input') as HTMLInputElement
      if (searchBox) {
        searchBox.value = location
        searchBox.dispatchEvent(new Event('input'))
      }
    }

    const handleAIDirections = (destination: string) => {
      // Future implementation for directions
      console.log('Get directions to:', destination)
    }

    const handleAIExplore = ({ category, radius }: { category: string, radius: number }) => {
      if (exploreNearby.value) {
        exploreNearby.value.selectCategory(category)
        exploreNearby.value.searchRadius = radius
        exploreNearby.value.searchNearby()
      }
    }

    onMounted(() => {
      auth.checkAuth()
      handleGpsRequest()
    })

    // Add watcher for menu state
    watch(activeMenu, (newMenu) => {
      document.body.dataset.activeMenu = newMenu || ''
    })

    return {
      mapView,
      exploreNearby,
      handleLocation,
      handleStyleUpdate,
      handleSearchSelect,
      handleTrafficToggle,
      handleShowPlaces,
      handleGpsRequest,
      currentLocation,
      handleAISearch,
      handleAIDirections,
      handleAIExplore
    }
  }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

@media (max-width: 767px) {

  body[data-active-menu="explore"] .chat-container,
  body[data-active-menu="explore"] .gps-button,
  body[data-active-menu="explore"] .map-options {
    display: none;
  }

  body[data-active-menu="chat"] .explore-fab,
  body[data-active-menu="chat"] .gps-button,
  body[data-active-menu="chat"] .map-options {
    display: none;
  }

  body[data-active-menu="options"] .explore-fab,
  body[data-active-menu="options"] .chat-container {
    display: none;
  }
}

@media (min-width: 768px) {
  body[data-active-menu] .explore-fab,
  body[data-active-menu] .chat-container,
  body[data-active-menu] .gps-button,
  body[data-active-menu] .map-options {
    display: block !important;
  }
}
</style>