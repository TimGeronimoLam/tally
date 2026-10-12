/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected from package.json by vite.config.ts */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
