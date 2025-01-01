<template>
  <MapView ref="mapView" />
  <GpsButton @location="handleLocation" />
  <MapOptions @update-style="handleStyleUpdate" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import MapView from './components/MapView.vue'
import GpsButton from './components/GpsButton.vue'
import MapOptions from './components/MapOptions.vue'

export default defineComponent({
  name: 'App',
  components: {
    MapView,
    GpsButton,
    MapOptions
  },
  setup() {
    const mapView = ref<InstanceType<typeof MapView> | null>(null)

    const handleLocation = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      mapView.value?.centerMap(latitude, longitude)
      mapView.value?.addMarker(latitude, longitude, 'You are here')
    }

    const handleStyleUpdate = (style: string) => {
      mapView.value?.updateMapStyle(style)
    }

    return {
      mapView,
      handleLocation,
      handleStyleUpdate
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
