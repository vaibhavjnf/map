import L, { type LatLngTuple } from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { apiKeys } from '../services/ApiKeyManager'

export class MapSettingsManager {
  private static readonly DEFAULT_SETTINGS = {
    DEFAULT_LAT: 16.047079,
    DEFAULT_LNG: 108.206230,
    DEFAULT_ZOOM: 12,
    MIN_ZOOM: 3,
    MAX_ZOOM: 18,
    STORAGE_KEY: 'last_map_position'
  }

  static getMapOptions() {
    const center: LatLngTuple = [this.DEFAULT_SETTINGS.DEFAULT_LAT, this.DEFAULT_SETTINGS.DEFAULT_LNG]
    
    return {
      center,
      zoom: this.DEFAULT_SETTINGS.DEFAULT_ZOOM,
      minZoom: this.DEFAULT_SETTINGS.MIN_ZOOM,
      maxZoom: this.DEFAULT_SETTINGS.MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
      worldCopyJump: true,
      maxBoundsViscosity: 1.0,
      renderer: L.canvas({
        padding: 0.5,
        tolerance: 0.8
      })
    }
  }

  static async createTileLayer(style: string) {
    const stadiaKey = await apiKeys.getKey('VITE_STADIA_API_KEY')
    return L.tileLayer(
      `https://tiles.stadiamaps.com/tiles/${style}/{z}/{x}/{y}{r}.png?api_key=${stadiaKey}`,
      {
        maxZoom: this.DEFAULT_SETTINGS.MAX_ZOOM,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
      }
    )
  }

  static saveMapPosition(map: LeafletMap) {
    const center = map.getCenter()
    const zoom = map.getZoom()
    
    localStorage.setItem(this.DEFAULT_SETTINGS.STORAGE_KEY, JSON.stringify({
      lat: center.lat,
      lng: center.lng,
      zoom: zoom,
      timestamp: Date.now()
    }))
  }

  static loadLastPosition() {
    try {
      const saved = localStorage.getItem(this.DEFAULT_SETTINGS.STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return {
            lat: data.lat,
            lng: data.lng,
            zoom: data.zoom
          }
        }
      }
    } catch (e) {
      console.error('Error loading last position:', e)
    }
    return {
      lat: this.DEFAULT_SETTINGS.DEFAULT_LAT,
      lng: this.DEFAULT_SETTINGS.DEFAULT_LNG,
      zoom: this.DEFAULT_SETTINGS.DEFAULT_ZOOM
    }
  }
}
