/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STADIA_API_KEY: string
  readonly VITE_THUNDERFOREST_API_KEY: string
  readonly VITE_DEFAULT_LAT: string
  readonly VITE_DEFAULT_LNG: string
  readonly VITE_DEFAULT_ZOOM: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
