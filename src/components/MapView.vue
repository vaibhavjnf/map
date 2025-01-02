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
import { debounce } from 'lodash'
import { MarkerManager } from '../utils/MarkerManager'
  
  declare const VITE_STADIA_API_KEY: string
  declare const VITE_THUNDERFOREST_API_KEY: string
  declare const VITE_DEFAULT_LAT: string
  declare const VITE_DEFAULT_LNG: string
  declare const VITE_DEFAULT_ZOOM: string

  interface ShowNearbyPlacesParams {
    results: any[];
    center: { lat: number; lng: number };
    category: string;
    radius: number;
    random: boolean;
  }
  
  export default defineComponent({
    name: 'MapView',
    setup() {
      const mapInstance: Ref<LeafletMap | null> = ref(null)
      const currentMarker: Ref<Marker | null> = ref(null)
      const lastPosition: Ref<LatLng | null> = ref(null)
      const currentStyle = ref('alidade_smooth')
      const trafficLayer: Ref<LayerGroup | null> = ref(null)
      const placeMarkers: Ref<Marker[]> = ref([])
      const markerManager = ref<MarkerManager>()

      const updateMapStyle = (style: string) => {
        if (mapInstance.value) {

          const currentPos = currentMarker.value?.getLatLng()
          
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

          if (currentPos && currentMarker.value) {
            currentMarker.value.setLatLng(currentPos);
          }
        }
      }
  
      const updateZoom = (zoom: number) => {
        mapInstance.value?.setZoom(zoom);
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

      const clearPlaceMarkers = () => {
        placeMarkers.value.forEach(marker => marker.remove())
        placeMarkers.value = []
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
  
      onMounted(() => {
        mapInstance.value = L.map('map-container', {
          scrollWheelZoom: true,
          touchZoom: true,
          fadeAnimation: true,
          zoomAnimation: true,
          markerZoomAnimation: true,
          zoomControl: false,
          preferCanvas: true, 
          zoomSnap: 0.5, 
          zoomDelta: 0.5,
          wheelDebounceTime: 150, 
          bounceAtZoomLimits: false, 
          maxZoom: 18, 
          renderer: L.canvas() 
        }).setView([
          Number(import.meta.env.VITE_DEFAULT_LAT), 
          Number(import.meta.env.VITE_DEFAULT_LNG)
        ], Number(import.meta.env.VITE_DEFAULT_ZOOM))
        
        L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${import.meta.env.VITE_STADIA_API_KEY}`, {
          maxZoom: 18,
          minZoom: 3,
          tileSize: 512, 
          zoomOffset: -1,
          crossOrigin: true,
          keepBuffer: 2,
          updateWhenIdle: true, 
          updateWhenZooming: false,
          noWrap: true, 
          bounds: [[-90, -180], [90, 180]] 
        }).addTo(mapInstance.value)
  
        markerManager.value = new MarkerManager(mapInstance.value)

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
  
        mapInstance.value.on('zoomend moveend', () => {
        
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
            requestAnimationFrame(() => {
              currentMarker.value?.setLatLng(lastPosition.value!)
            })
          }
        });
      })
  
      const centerMap = (latitude: number, longitude: number) => {
        mapInstance.value?.setView([latitude, longitude], 16)
      }
  
      const addMarker = (latitude: number, longitude: number, popupText: string) => {
        if (!mapInstance.value || !markerManager.value) return

        const latlng = L.latLng(latitude, longitude)
        const marker = markerManager.value.addMarker('gps', latlng, {
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: 'gps-marker',
            html: '<span class="material-icons">my_location</span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }, true) // Set isSpecial = true

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
      }
    }
  })
  </script>
  
  <style scoped>
  #map-container {
    height: 100vh;
    width: 100vw;
    position: fixed;
    background: transparent;
  }
  
  :deep(.leaflet-fade-anim .leaflet-tile) {
    will-change: opacity;
    transition: opacity 0.2s linear;
  }
  
  :deep(.leaflet-zoom-anim .leaflet-zoom-animated) {
    will-change: transform;
    transition: transform 0.25s cubic-bezier(0,0,0.25,1);
  }

  :deep(.place-marker) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px !important;
    height: 24px !important;
    margin-left: -12px !important;
    margin-top: -24px !important;
    pointer-events: auto !important;
    z-index: 1000 !important; 
  }
  
  :deep(.place-marker .material-icons) {
    color: #E91E63;
    font-size: 24px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    position: relative;
    z-index: 1;
  }

  :deep(.place-marker:hover .material-icons) {
    transform: none;
  }

  :deep(.leaflet-popup-content) {
    margin: 10px 12px;
    line-height: 1.5;
  }

  :deep(.leaflet-popup-content-wrapper) {
    border-radius: 8px;
    padding: 2px;
  }

  @media (max-width: 768px) {
    :deep(.leaflet-control-zoom) {
      display: none;
    }
  }

  :deep(.place-marker.google) .material-icons {
    color: #4285F4;
  }

  :deep(.place-marker.here) .material-icons {
    color: #00AFD7;
  }

  :deep(.place-marker.openstreetmap) .material-icons {
    color: #7EBC6F;
  }

  :deep(.gps-marker) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.gps-marker .material-icons) {
    color: #1976D2;
    font-size: 24px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
  }
  </style>