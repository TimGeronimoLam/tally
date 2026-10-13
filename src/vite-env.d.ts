/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected from package.json by vite.config.ts */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** VAPID public key for the daily reminder (scripts/gen-vapid.mjs). */
  readonly VITE_VAPID_PUBLIC_KEY?: string
  /** Cloudflare Turnstile site key; leave empty while Supabase's captcha is off. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
