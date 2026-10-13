/**
 * The service worker. Built by vite-plugin-pwa (injectManifest), typed by
 * tsconfig.sw.json. Offline behaviour matches the worker the plugin used to
 * generate; on top of that it shows the daily reminder push (worker/).
 */
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

// Take over at once (registerType 'autoUpdate'), precache the app shell, and
// answer every navigation (/stats, /join/CODE) with index.html, offline too.
void self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

/** `notification` of the push payload (worker/reminders.ts). */
interface PushNotice {
  title: string
  body?: string
  navigate?: string
  lang?: string
  tag?: string
}

function readPush(data: PushMessageData | null): PushNotice {
  try {
    const json = data?.json() as { notification?: PushNotice } | undefined
    if (json?.notification?.title) return json.notification
  } catch {
    // not JSON: fall through
  }
  return { title: 'Tally' }
}

// Always show something: a push without a notification earns a generic
// "site updated" notice on Chrome and counts against the subscription on iOS.
self.addEventListener('push', (event) => {
  const notice = readPush(event.data)
  const options = {
    body: notice.body,
    tag: notice.tag,
    lang: notice.lang,
    icon: '/pwa-192x192.png',
    data: { url: notice.navigate ?? '/' },
    // Alert again when today's reminder replaces an unread one from
    // yesterday (same tag). Not in lib.dom; ignored where unsupported.
    renotify: notice.tag !== undefined,
  }
  event.waitUntil(
    self.registration.showNotification(
      notice.title,
      options as NotificationOptions,
    ),
  )
})

/** The notification's target if it is on this origin, else the start page. */
function targetUrl(raw: unknown): string {
  const origin = self.location.origin
  try {
    const url = new URL(typeof raw === 'string' ? raw : '/', origin)
    if (url.origin === origin) return url.href
  } catch {
    // fall through
  }
  return `${origin}/`
}

async function openApp(url: string): Promise<void> {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  const open = windows.find(
    (c) => new URL(c.url).origin === self.location.origin,
  )
  if (open) {
    await open.focus()
    return
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { url?: unknown } | null
  event.waitUntil(openApp(targetUrl(data?.url)))
})
