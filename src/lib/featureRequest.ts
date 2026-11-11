import { APP_VERSION } from '../changelog/index.ts'
import { messages } from '../i18n/index.ts'
import { captchaToken } from './captcha.ts'

export interface FeatureRequestInput {
  message: string
  /** Optional address for a reply. */
  email?: string
  /** Active Intl tag, so the reply can be in the sender's language. */
  lang: string
}

/**
 * Mail a feature request through the Worker (worker/feature-request.ts).
 * Rejects with a translated message; the captcha's own failure keeps its
 * wording.
 */
export async function sendFeatureRequest(
  input: FeatureRequestInput,
): Promise<void> {
  const captcha = await captchaToken('feedback')
  let res: Response
  try {
    res = await fetch('/api/feature-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, captcha, version: APP_VERSION }),
    })
  } catch {
    throw new Error(messages().account.featureFailed)
  }
  if (res.status === 403) throw new Error(messages().errors.captchaFailed)
  if (!res.ok) throw new Error(messages().account.featureFailed)
}
