<template>
  <div class="map-background"></div>
  <div class="map-grid"></div>
  <div id="map-container"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, type Ref } from 'vue'
import type { Map as LeafletMap, Marker, LatLng, LayerGroup } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'
import { toast } from './Toast.vue'
import { MarkerManager } from '../utils/MarkerManager'
import { MapSettingsManager } from '../utils/MapSettingsManager'
import { IslandManager } from '../utils/IslandManager'

interface ShowNearbyPlacesParams {
  results: any[];
  center: { lat: number; lng: number };
  category: string;
  radius: number;
  random: boolean;
}

// Default settings
const DEFAULT_SETTINGS = {
  DEFAULT_LAT: 16.047079,
  DEFAULT_LNG: 108.206230,
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  STORAGE_KEY: 'last_map_position',
  ZOOM_THRESHOLD: 10
}

export default defineComponent({
  name: 'MapView',
  setup() {

    const mapInstance: Ref<LeafletMap | null> = ref(null)
    const currentMarker: Ref<Marker | null> = ref(null)
    const lastPosition: Ref<LatLng | null> = ref(null)
    const currentStyle = ref('alidade_smooth')
    const trafficLayer: Ref<LayerGroup | null> = ref(null)
    const markerManager = ref<MarkerManager>()
    const islandManager = ref<IslandManager>()

    const updateMapStyle = async (style: string) => {
      if (!mapInstance.value) return
      const currentPos = currentMarker.value?.getLatLng()
      
      const tileLayer = await MapSettingsManager.createTileLayer(style)

      mapInstance.value.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          mapInstance.value?.removeLayer(layer)
        }
      })

      tileLayer.addTo(mapInstance.value)

      if (currentPos && currentMarker.value) {
        currentMarker.value.setLatLng(currentPos)
      }
    }

    const updateZoom = (zoom: number) => {
      mapInstance.value?.setZoom(zoom)
    }

    const toggleTraffic = (show: boolean) => {
      if (!mapInstance.value) return;

      if (show) {
        if (!trafficLayer.value) {
          trafficLayer.value = L.layerGroup().addTo(mapInstance.value);
          
          L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + import.meta.env.VITE_THUNDERFOREST_API_KEY, {
            maxZoom: 19,
            opacity: 0.7,
            attribution: '&copy; OpenStreetMap contributors, &copy; Thunderforest'
          }).addTo(trafficLayer.value);

          fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `
              [out:json][timeout:25];
              (
                way["highway"](around:10000,${mapInstance.value.getCenter().lat},${mapInstance.value.getCenter().lng});
              );
              out body;
              >;
              out skel qt;
            `
          })
          .then(response => response.json())
          .then(data => {
            L.geoJSON(data, {
              style: (feature) => {
                return {
                  color: '#FF4444',
                  weight: 3,
                  opacity: 0.6
                };
              }
            }).addTo(trafficLayer.value!);
          });
        }
      } else {
        trafficLayer.value?.clearLayers();
        trafficLayer.value = null;
      }
    }

    const showNearbyPlaces = async (params: ShowNearbyPlacesParams) => {
      if (!markerManager.value) return
    
      markerManager.value.clearMarkers()

      const { results, center, category } = params
      
      if (!results || results.length === 0) {
        toast.show('No places found in this area', 'info')
        return
      }

      results.forEach((place: any, index: number) => {
        const markerId = `place_${index}`
        const marker = markerManager.value!.addMarker(markerId, 
          L.latLng(place.lat, place.lng),
          {
            icon: L.divIcon({
              className: `place-marker ${place.source}`,
              html: `<span class="material-icons">place</span>`,
              iconSize: [24, 24],
              iconAnchor: [12, 24]
            })
          }
        )

        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif;">
            <strong style="font-size: 14px;">${place.name}</strong>
            <div style="color: #666; font-size: 12px;">
              Source: ${place.source}
            </div>
            <div style="color: #4CAF50; margin-top: 4px; font-size: 13px;">
              ${formatDistance(L.latLng(center.lat, center.lng)
                .distanceTo(L.latLng(place.lat, place.lng)))}
            </div>
          </div>
        `)
      })

      if (results.length > 0) {
        const bounds = L.latLngBounds(results.map(r => L.latLng(r.lat, r.lng)))
        mapInstance.value?.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    const formatDistance = (meters: number): string => {

      meters = Math.round(meters)
      if (meters < 1000) {
        return `${meters}m`
      }

      return `${(meters / 1000).toFixed(1)}km`
    }

    onMounted(async () => {
      try {
        const savedStyle = localStorage.getItem('defaultMapStyle') || 'alidade_smooth'
        currentStyle.value = savedStyle
        const lastPos = MapSettingsManager.loadLastPosition()
        
        mapInstance.value = L.map('map-container', {
          ...MapSettingsManager.getMapOptions(),
          center: [lastPos.lat, lastPos.lng] as L.LatLngTuple,
          zoom: lastPos.zoom,
          fadeAnimation: false,
          markerZoomAnimation: false,
          zoomAnimation: true,
          zoomSnap: 0.5,
          wheelDebounceTime: 40,
          preferCanvas: true
        })

        const tileLayer = await MapSettingsManager.createTileLayer(savedStyle)
        tileLayer.addTo(mapInstance.value)

        markerManager.value = new MarkerManager(mapInstance.value)
        islandManager.value = new IslandManager(mapInstance.value) 

        mapInstance.value.on('zoomend moveend', () => {
          const zoom = mapInstance.value?.getZoom() || 0;
          const elements = document.querySelectorAll('.label-glow');
          
          elements.forEach((el) => {

            const htmlEl = el as HTMLElement;
            if (zoom < DEFAULT_SETTINGS.ZOOM_THRESHOLD) {
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
            requestAnimationFrame(() => {
              currentMarker.value?.setLatLng(lastPosition.value!)
            })
          }
        });

        mapInstance.value.on('zoomstart', () => {
          document.body.style.cursor = 'grabbing';
        });

        mapInstance.value.on('zoomend', () => {
          document.body.style.cursor = 'auto';
        });

        mapInstance.value.on('moveend', () => {
          const center = mapInstance.value!.getCenter();
          MapSettingsManager.saveMapPosition(mapInstance.value!)
        });

        mapInstance.value.on('moveend zoomend', () => {
          MapSettingsManager.saveMapPosition(mapInstance.value!)
        })

      } catch (error) {
        console.error('Failed to initialize map:', error)
        toast.show('Failed to load map. Please refresh the page.', 'error')
      }
    })

    const centerMap = (latitude: number, longitude: number) => {
      mapInstance.value?.setView([latitude, longitude], 16)
    }

    const addMarker = (latitude: number, longitude: number, popupText: string, type: 'gps' | 'search' = 'gps') => {
      if (!mapInstance.value || !markerManager.value) return

      const latlng = L.latLng(latitude, longitude)
      const icon = type === 'gps' ? 
        {
          className: 'gps-marker',
          html: '<span class="material-icons">my_location</span>',
          iconSize: [24, 24] as [number, number],
          iconAnchor: [12, 12] as [number, number]
        } :
        {
          className: 'search-marker',
          html: '<span class="material-icons">place</span>',
          iconSize: [24, 24] as [number, number],
          iconAnchor: [12, 24] as [number, number]
        }

      const marker = markerManager.value.addMarker(
        type, 
        latlng,
        {
          zIndexOffset: type === 'gps' ? 2000 : 1000,
          icon: L.divIcon(icon)
        },
        type === 'gps' 
      )

      marker.bindPopup(popupText)
    }

    return {
      mapInstance,
      centerMap,
      addMarker,
      updateMapStyle,
      updateZoom,
      toggleTraffic,
      showNearbyPlaces,
      formatDistance
    }  }})</script>

<style scoped>
@import "../styles/map.css";
</style>