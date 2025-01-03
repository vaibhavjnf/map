<template>
  <MapView ref="mapView" />
  <SearchBox 
    v-if="activeMenu !== 'auth'"
    :currentLocation="currentLocation" 
    @select-location="handleSearchSelect" 
  />
  <AccountButton />
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
import ChatButton from './components/ChatAI.vue'
import AccountButton from './components/AccountButton.vue'
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
    ChatButton,
    AccountButton
  },
  setup() {
    const mapView = ref<InstanceType<typeof MapView> | null>(null)
    const exploreNearby = ref<InstanceType<typeof ExploreNearby> | null>(null)
    const currentLocation = ref<{ lat: number; lng: number } | null>(null)
    
    const handleLocation = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      currentLocation.value = { lat: latitude, lng: longitude }
      
      requestAnimationFrame(() => {

        exploreNearby.value?.updateLocation({ lat: latitude, lng: longitude })
        
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

    const handleAISearch = (location: { name: string; latitude: number; longitude: number }) => {
      handleSearchSelect({
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude
      });
    }

    const handleAIDirections = (destination: string) => {

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
      handleAIExplore,
      activeMenu
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
  body[data-active-menu="chat"] .map-options,
  body[data-active-menu="chat"] .account-container,
  body[data-active-menu="chat"] .search-container { 
    display: none;
  }

  body[data-active-menu="options"] .chat-container {
    display: none;
  }

  body[data-active-menu="auth"] .explore-fab,
  body[data-active-menu="auth"] .chat-container,
  body[data-active-menu="auth"] .gps-button,
  body[data-active-menu="auth"] .map-options {
    display: none;
  }

  body[data-active-menu="auth"] .search-container {
    display: none;
  }

  body:not([data-active-menu]) .bottom-sheet,
  body[data-active-menu="search"] .bottom-sheet {
    display: none !important;
  }
}

@media (min-width: 768px) {
  body[data-active-menu] .chat-container,
  body[data-active-menu] .gps-button,
  body[data-active-menu] .map-options {
    display: block !important;
  }

  body[data-active-menu="chat"] .account-menu {
    display: none;
  }

  body[data-active-menu="account"] .chat-window {
    display: none;
  }
}
</style>