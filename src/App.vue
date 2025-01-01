<template>
  <MapView ref="mapView" />
  <SearchBox @select-location="handleSearchSelect" />
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
  <Toast />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import MapView from './components/MapView.vue'
import GpsButton from './components/GpsButton.vue'
import MapOptions from './components/MapOptions.vue'
import SearchBox from './components/SearchBox.vue'
import ExploreNearby from './components/ExploreNearby.vue'
import Toast, { toast } from './components/Toast.vue'
import L from 'leaflet'

export default defineComponent({
  name: 'App',
  components: {
    MapView,
    GpsButton,
    MapOptions,
    SearchBox,
    ExploreNearby,
    Toast
  },
  setup() {
    const mapView = ref<InstanceType<typeof MapView> | null>(null)
    const exploreNearby = ref<InstanceType<typeof ExploreNearby> | null>(null)
    
    const handleLocation = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      mapView.value?.centerMap(latitude, longitude)
      mapView.value?.addMarker(latitude, longitude, 'You are here')
      exploreNearby.value?.updateLocation({ lat: latitude, lng: longitude })
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
      mapView.value?.addMarker(latitude, longitude, name)
    }

    const handleTrafficToggle = (show: boolean) => {
      mapView.value?.toggleTraffic(show)
    }

    const handleShowPlaces = ({ category, radius, random, center }: { 
      category: string;
      radius: number;
      random: boolean;
      center: { lat: number; lng: number };
    }) => {
      if (mapView.value) {
        mapView.value.showNearbyPlaces(L.latLng(center.lat, center.lng), category, radius, random)
      }
    }

    onMounted(() => {
      handleGpsRequest()
    })

    return {
      mapView,
      exploreNearby,
      handleLocation,
      handleStyleUpdate,
      handleSearchSelect,
      handleTrafficToggle,
      handleShowPlaces,
      handleGpsRequest
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
</style>