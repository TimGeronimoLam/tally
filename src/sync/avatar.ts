import type { Session } from '@supabase/supabase-js'
import { messages } from '../i18n/index.ts'
import { recordError } from '../lib/diagnostics.ts'
import { supabase } from '../lib/supabase.ts'

/**
 * Profile pictures: one square JPEG per email account in the public
 * `avatars` bucket, at `<user id>.jpg`. `profiles.avatar_updated_at` says
 * whether there is one and goes into the URL, so a new upload is never
 * hidden by a cached old one. The same timestamp is mirrored to the
 * account's user metadata for the user's own avatar.
 * See supabase/migrations/20261111000000_profile_pictures.sql.
 */

const BUCKET = 'avatars'
/** Edge length of the stored picture; shown at up to 40px, so 3x and then some. */
export const AVATAR_SIZE = 256
const QUALITY = 0.85

function requireClient() {
  if (!supabase) throw new Error(messages().errors.syncNotConfigured)
  return supabase
}

/** Public URL of a member's picture, or null when they have none. */
export function avatarUrl(
  userId: string,
  updatedAt: string | null | undefined,
): string | null {
  if (!supabase || !updatedAt) return null
  const { publicUrl } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${userId}.jpg`).data
  const v = Date.parse(updatedAt)
  return `${publicUrl}?v=${Number.isNaN(v) ? encodeURIComponent(updatedAt) : v}`
}

/** The signed-in user's own picture, from their account. Email accounts only. */
export function ownAvatarUrl(session: Session | null): string | null {
  const user = session?.user
  if (!user || user.is_anonymous) return null
  const updatedAt = user.user_metadata?.avatar_updated_at
  return avatarUrl(user.id, typeof updatedAt === 'string' ? updatedAt : null)
}

/** The centred square to cut from a `width` × `height` image. */
export function squareCrop(
  width: number,
  height: number,
): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height)
  return {
    sx: Math.round((width - size) / 2),
    sy: Math.round((height - size) / 2),
    size,
  }
}

/**
 * Centre-crop to a square and scale to AVATAR_SIZE as JPEG. The browser
 * applies the photo's EXIF rotation when decoding. iOS hands over HEIC
 * photos as JPEG from a file input.
 */
export async function resizeAvatar(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(messages().sync.photoUnreadable)
  }
  try {
    const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height)
    const out = Math.min(AVATAR_SIZE, size)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(messages().sync.photoUnreadable)
    // JPEG has no transparency; a transparent PNG would turn black.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, out, out)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, out, out)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) throw new Error(messages().sync.photoUnreadable)
    return blob
  } finally {
    bitmap.close()
  }
}

async function emailSession(): Promise<Session> {
  const session = (await requireClient().auth.getSession()).data.session
  if (!session || session.user.is_anonymous) {
    throw new Error(messages().sync.photoNeedsSignIn)
  }
  return session
}

/** Record the picture's timestamp (or null) where co-members and other phones see it. */
async function saveUpdatedAt(
  session: Session,
  updatedAt: string | null,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('profiles')
    .upsert(
      { user_id: session.user.id, avatar_updated_at: updatedAt },
      { onConflict: 'user_id' },
    )
  if (error)
    throw new Error(`${messages().sync.photoNotSaved}: ${error.message}`)
  const meta = await client.auth.updateUser({
    data: { avatar_updated_at: updatedAt },
  })
  if (meta.error) throw meta.error
}

/** Resize `file` and make it the signed-in user's picture. */
export async function uploadAvatar(file: Blob): Promise<void> {
  const session = await emailSession()
  const blob = await resizeAvatar(file)
  const { error } = await requireClient()
    .storage.from(BUCKET)
    .upload(`${session.user.id}.jpg`, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      // The URL changes with every upload, so any copy can be kept for good.
      cacheControl: '31536000',
    })
  if (error)
    throw new Error(`${messages().sync.photoNotSaved}: ${error.message}`)
  await saveUpdatedAt(session, new Date().toISOString())
}

/** Back to initials: clear the timestamp first, then delete the file. */
export async function removeAvatar(): Promise<void> {
  const session = await emailSession()
  await saveUpdatedAt(session, null)
  const { error } = await requireClient()
    .storage.from(BUCKET)
    .remove([`${session.user.id}.jpg`])
  // Nobody can find the file once the timestamp is gone; not worth failing.
  if (error) recordError('avatar', error)
}

/**
 * When each of `userIds` last uploaded a picture, for those who have one
 * and share a challenge with the caller. Never throws: until the
 * migration is run, or offline, everyone just keeps their initial.
 */
export async function fetchAvatarVersions(
  userIds: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  const ids = [...new Set(userIds)].filter(Boolean)
  if (!supabase || ids.length === 0) return found
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, avatar_updated_at')
      .in('user_id', ids)
      .not('avatar_updated_at', 'is', null)
    if (error) throw error
    for (const r of (data ?? []) as {
      user_id: string
      avatar_updated_at: string | null
    }[]) {
      if (r.avatar_updated_at) found.set(r.user_id, r.avatar_updated_at)
    }
  } catch (err) {
    // Polled every 30 s: one diagnostics entry per launch is enough.
    if (!lookupFailed) recordError('avatar', err)
    lookupFailed = true
  }
  return found
}

let lookupFailed = false
