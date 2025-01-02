import type { Map as LeafletMap, Marker, LatLng } from 'leaflet'
import L from 'leaflet'

export class MarkerManager {
  private map: LeafletMap
  private markers: Map<string, Marker> = new Map()
  private positions: Map<string, LatLng> = new Map()
  private specialMarkers: Set<string> = new Set(['gps', 'current']) 

  constructor(map: LeafletMap) {
    this.map = map
    
    this.map.on('zoomend moveend', () => {
      requestAnimationFrame(() => this.updateMarkerPositions())
    })
  }

  addMarker(id: string, latlng: LatLng, options?: L.MarkerOptions, isSpecial: boolean = false): Marker {

    this.removeMarker(id)
    
    if (isSpecial) {
      this.specialMarkers.add(id)
    }

    this.positions.set(id, latlng)

    const marker = L.marker(latlng, {
      ...options,

      autoPan: false,
      riseOnHover: false,
      bubblingMouseEvents: false
    }).addTo(this.map)

    this.markers.set(id, marker)

    return marker
  }

  removeMarker(id: string) {
    const marker = this.markers.get(id)
    if (marker) {
      marker.remove()
      this.markers.delete(id)
      this.positions.delete(id)
      this.specialMarkers.delete(id)
    }
  }

  clearMarkers() {

    this.markers.forEach((marker, id) => {
      if (!this.specialMarkers.has(id)) {
        marker.remove()
        this.markers.delete(id)
        this.positions.delete(id)
      }
    })
  }

  private updateMarkerPositions() {
    this.positions.forEach((position, id) => {
      const marker = this.markers.get(id)
      if (marker) {
        marker.setLatLng(position)
      }
    })
  }  getMarker(id: string): Marker | undefined {
    return this.markers.get(id)
  }

  setPopupContent(id: string, content: string) {
    const marker = this.markers.get(id)
    if (marker) {
      marker.bindPopup(content)
    }
  }
}
