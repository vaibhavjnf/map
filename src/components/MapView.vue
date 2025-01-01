<template>
  <div id="map-container"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, type Ref } from 'vue'
import type { Map as LeafletMap, Marker, LatLng } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'

export default defineComponent({
  name: 'MapView',
  setup() {
    const mapInstance: Ref<LeafletMap | null> = ref(null)
    const currentMarker: Ref<Marker | null> = ref(null)
    const lastPosition: Ref<LatLng | null> = ref(null)
    const currentStyle = ref('alidade_smooth')

    const updateMapStyle = (style: string) => {
      if (mapInstance.value) {
        const tileLayer = L.tileLayer(`https://tiles.stadiamaps.com/tiles/${style}/{z}/{x}/{y}{r}.png`, {
          maxZoom: 20,
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        });

        mapInstance.value.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            mapInstance.value?.removeLayer(layer);
          }
        });

        tileLayer.addTo(mapInstance.value);
      }
    }

    const updateZoom = (zoom: number) => {
      mapInstance.value?.setZoom(zoom);
    }

    onMounted(() => {
      mapInstance.value = L.map('map-container', {
        scrollWheelZoom: true,
        touchZoom: true
      }).setView([21.0285, 105.8542], 13)
      
      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
      }).addTo(mapInstance.value)

      const ZOOM_THRESHOLD = 6; 

      const createIslandLabel = (text: string) => {
        return L.divIcon({
          className: 'island-label vietnam-territory',
          html: `<div class="label-wrapper"><span class="label-glow">${text}</span></div>`,
          iconSize: [200, 30],
          iconAnchor: [100, 15]
        });
      };

      const hoangSaMarker = L.marker([16.4, 112.0], {
        icon: createIslandLabel('Hoàng Sa (Đà Nẵng - Việt Nam)')
      }).addTo(mapInstance.value);

      const truongSaMarker = L.marker([8.64, 111.92], {
        icon: createIslandLabel('Trường Sa (Khánh Hòa - Việt Nam)')
      }).addTo(mapInstance.value);

      mapInstance.value.on('zoomend', () => {
        const zoom = mapInstance.value?.getZoom() || 0;
        const elements = document.querySelectorAll('.label-glow');
        
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (zoom < ZOOM_THRESHOLD) {
            htmlEl.style.opacity = '0';
            htmlEl.style.visibility = 'hidden';
          } else {
            htmlEl.style.opacity = '1';
            htmlEl.style.visibility = 'visible';
            const scale = Math.min(1, Math.max(0.5, zoom / 13));
            htmlEl.style.transform = `scale(${scale})`;
          }
        });

        if (lastPosition.value && currentMarker.value) {
          currentMarker.value.setLatLng(lastPosition.value);
        }
      });
    })

    const centerMap = (latitude: number, longitude: number) => {
      mapInstance.value?.setView([latitude, longitude], 16)
    }

    const addMarker = (latitude: number, longitude: number, popupText: string) => {
      if (mapInstance.value) {
        if (currentMarker.value) {
          currentMarker.value.remove()
        }

        lastPosition.value = L.latLng(latitude, longitude)
        currentMarker.value = L.marker(lastPosition.value, {
          autoPan: false,
          interactive: true
        })
          .addTo(mapInstance.value)
          .bindPopup(popupText)
      }
    }

    return {
      mapInstance,
      centerMap,
      addMarker,
      updateMapStyle,
      updateZoom
    }
  }
})
</script>

<style scoped>
</style>
