import L from 'leaflet';

export class IslandManager {
  private map: L.Map;
  private hoangSaMarker: L.Marker | null = null;
  private truongSaMarker: L.Marker | null = null;
  private readonly ZOOM_THRESHOLD = 6;

  constructor(map: L.Map) {
    this.map = map;
    this.initializeIslands();
    this.setupZoomHandler();
  }

  private createIslandLabel(text: string) {
    return L.divIcon({
      className: 'island-label vietnam-territory',
      html: `<div class="label-wrapper"><span class="label-glow">${text}</span></div>`,
      iconSize: [200, 30],
      iconAnchor: [100, 15]
    });
  }

  private initializeIslands() {
    this.hoangSaMarker = L.marker([16.4, 112.0], {
      icon: this.createIslandLabel('Hoàng Sa (Đà Nẵng - Việt Nam)')
    }).addTo(this.map);

    this.truongSaMarker = L.marker([8.64, 111.92], {
      icon: this.createIslandLabel('Trường Sa (Khánh Hòa - Việt Nam)')
    }).addTo(this.map);
  }

  private setupZoomHandler() {
    this.map.on('zoomend', () => {
      const zoom = this.map.getZoom();
      const elements = document.querySelectorAll('.label-glow');
      
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (zoom < this.ZOOM_THRESHOLD) {
          htmlEl.style.opacity = '0';
          htmlEl.style.visibility = 'hidden';
        } else {
          htmlEl.style.opacity = '1';
          htmlEl.style.visibility = 'visible';
          const scale = Math.min(1, Math.max(0.5, zoom / 13));
          htmlEl.style.transform = `scale(${scale})`;
        }
      });
    });
  }

  remove() {
    this.hoangSaMarker?.remove();
    this.truongSaMarker?.remove();
  }
}
