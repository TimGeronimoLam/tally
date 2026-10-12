export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/** Web Share API when available, otherwise copy the URL to the clipboard. */
export async function shareLink(data: {
  title: string
  text: string
  url: string
}): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      // fall through to clipboard
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed'
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
