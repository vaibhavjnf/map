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
  
  declare const VITE_STADIA_API_KEY: string
  declare const VITE_THUNDERFOREST_API_KEY: string
  declare const VITE_DEFAULT_LAT: string
  declare const VITE_DEFAULT_LNG: string
  declare const VITE_DEFAULT_ZOOM: string
  
  export default defineComponent({
    name: 'MapView',
    setup() {
      const mapInstance: Ref<LeafletMap | null> = ref(null)
      const currentMarker: Ref<Marker | null> = ref(null)
      const lastPosition: Ref<LatLng | null> = ref(null)
      const currentStyle = ref('alidade_smooth')
      const trafficLayer: Ref<LayerGroup | null> = ref(null)
      const placeMarkers: Ref<Marker[]> = ref([])

      const updateMapStyle = (style: string) => {
        if (mapInstance.value) {
          // Lưu lại vị trí marker hiện tại trước khi thay đổi style
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

          // Cập nhật lại marker sau khi thay đổi style
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

      const showNearbyPlaces = async (center: LatLng, category: string, radius: number, random = false) => {
        clearPlaceMarkers()
        
        const categoryQuery = category.includes('=') 
          ? `["${category.split('=')[0]}"="${category.split('=')[1]}"]`
          : `["amenity"="${category}"]`;

        const query = `
          [out:json][timeout:25];
          (
            node${categoryQuery}(around:${radius},${center.lat},${center.lng});
            way${categoryQuery}(around:${radius},${center.lat},${center.lng});
            relation${categoryQuery}(around:${radius},${center.lat},${center.lng});
          );
          out body;
          >;
          out skel qt;
        `
  
        try {
          const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
          })
  
          if (!response.ok) throw new Error('Network response was not ok')

          const data = await response.json()
          let places = data.elements.filter((place: any) => 
            place.tags && place.tags.name 
          )
  
          if (places.length === 0) {
            toast.show('No places found in this area', 'info')
            return
          }
  
          if (random) {
            places = places
              .sort(() => Math.random() - 0.5)
              .slice(0, 5)
          }
  
          places.forEach((place: any) => {
            const lat = place.lat || place.center?.lat
            const lng = place.lon || place.center?.lon
            if (!lat || !lng) return 
  
            const name = place.tags.name
            const marker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'place-marker',
                html: `<span class="material-icons">place</span>`,
                iconSize: [24, 24],
                iconAnchor: [12, 24]
              }),
              autoPan: false,         
              riseOnHover: true,      
              riseOffset: 250,         
              interactive: true,     
              bubblingMouseEvents: false 
            })
              .addTo(mapInstance.value!)
              .bindPopup(`
                <strong>${name}</strong><br>
                ${place.tags.amenity || place.tags.leisure || category}
              `)
  
            placeMarkers.value.push(marker)
          })
  
          if (placeMarkers.value.length > 0) {
            const bounds = L.latLngBounds(placeMarkers.value.map(marker => marker.getLatLng()))
            mapInstance.value?.fitBounds(bounds, { padding: [50, 50] })
          }
        } catch (error) {
          console.error('Error fetching nearby places:', error)
          toast.show('Error fetching places. Please try again.', 'error')
        }
      }
  
      onMounted(() => {
        mapInstance.value = L.map('map-container', {
          scrollWheelZoom: true,
          touchZoom: true,
          fadeAnimation: true,
          zoomAnimation: true,
          markerZoomAnimation: true,
          zoomControl: false 
        }).setView([
          Number(import.meta.env.VITE_DEFAULT_LAT), 
          Number(import.meta.env.VITE_DEFAULT_LNG)
        ], Number(import.meta.env.VITE_DEFAULT_ZOOM))
        
        L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${import.meta.env.VITE_STADIA_API_KEY}`, {
          maxZoom: 20,
          minZoom: 3,
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
          noWrap: true, 
          bounds: [[-90, -180], [90, 180]] 
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
        if (mapInstance.value) {
          if (currentMarker.value) {
            currentMarker.value.remove()
          }
  
          lastPosition.value = L.latLng(latitude, longitude)
          currentMarker.value = L.marker(lastPosition.value, {
            autoPan: false,
            interactive: true,
            zIndexOffset: 1000 
          })
            .addTo(mapInstance.value)
            .bindPopup(popupText)

          mapInstance.value.on('zoomend moveend', () => {
            if (lastPosition.value && currentMarker.value) {
              requestAnimationFrame(() => {
                if (currentMarker.value) {
                  currentMarker.value.setLatLng(lastPosition.value!)
                }
              })
            }
          })
        }
      }
  
      return {
        mapInstance,
        centerMap,
        addMarker,
        updateMapStyle,
        updateZoom,
        toggleTraffic,
        showNearbyPlaces
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
  
  /* Add transition for smooth zoom */
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
    z-index: 1000 !important; /* Đảm bảo marker luôn ở trên cùng */
  }
  
  :deep(.place-marker .material-icons) {
    color: #E91E63;
    font-size: 24px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    transition: transform 0.2s ease;
    transform-origin: bottom center;
    position: relative;
    z-index: 1;
  }

  :deep(.place-marker:hover .material-icons) {
    transform: scale(1.2);
  }

  /* Ẩn nút zoom trên mobile */
  @media (max-width: 768px) {
    :deep(.leaflet-control-zoom) {
      display: none;
    }
  }
  </style>