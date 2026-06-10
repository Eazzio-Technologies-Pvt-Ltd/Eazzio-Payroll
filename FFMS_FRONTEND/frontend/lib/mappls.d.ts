/**
 * Global type declarations for the Mappls SDK.
 * The SDK injects `mappls` and `L` (Leaflet) onto `window`.
 */

interface MapplsMapOptions {
  center?: [number, number] | { lat: number; lng: number };
  zoom?: number;
  zoomControl?: boolean;
  search?: boolean;
  location?: boolean;
  hybrid?: boolean;
}

interface MapplsSDK {
  Map: new (container: string | HTMLElement, options?: MapplsMapOptions) => any;
  Marker: new (options: Record<string, any>) => any;
  Circle: new (options: Record<string, any>) => any;
  /** Factory function — do NOT use `new` */
  Polyline: (options: Record<string, any>) => any;
  remove: (options: { map: any; layer: any }) => void;
}

declare global {
  interface Window {
    mappls: MapplsSDK;
    L: typeof import("leaflet");
  }
  var mappls: MapplsSDK;
}

export {};

