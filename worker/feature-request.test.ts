import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  featureRequestEmail,
  handleFeatureRequest,
  MAX_MESSAGE,
  parseFeatureRequest,
} from './feature-request.ts'

describe('parseFeatureRequest', () => {
  it('trims and keeps the known fields', () => {
    expect(
      parseFeatureRequest({
        message: '  Dark mode for charts \n',
        email: ' a@b.co ',
        lang: 'de',
        version: '1.5.0',
        extra: 'ignored',
      }),
    ).toEqual({
      message: 'Dark mode for charts',
      email: 'a@b.co',
      captcha: undefined,
      lang: 'de',
      version: '1.5.0',
    })
  })

  it('rejects a missing, blank or too long message', () => {
    expect(parseFeatureRequest(null)).toBeTypeOf('string')
    expect(parseFeatureRequest({ message: '   ' })).toBeTypeOf('string')
    expect(
      parseFeatureRequest({ message: 'x'.repeat(MAX_MESSAGE + 1) }),
    ).toBeTypeOf('string')
  })

  it('treats a blank email as none and rejects a bad one', () => {
    expect(parseFeatureRequest({ message: 'hi', email: '' })).toMatchObject({
      email: undefined,
    })
    expect(parseFeatureRequest({ message: 'hi', email: 'nope' })).toBe(
      'email is not valid',
    )
  })
})

describe('featureRequestEmail', () => {
  it('uses the first line as subject and the sender as reply-to', () => {
    const mail = featureRequestEmail(
      { message: 'Rest timer\nBetween sets please', email: 'a@b.co' },
      { from: 'Tally <x@y.z>', to: 'me@example.com' },
    )
    expect(mail.subject).toBe('Tally feature request: Rest timer')
    expect(mail.to).toEqual(['me@example.com'])
    expect(mail.reply_to).toBe('a@b.co')
    expect(mail.text).toContain('Between sets please')
  })

  it('shortens a long subject and leaves out reply-to without an email', () => {
    const mail = featureRequestEmail(
      { message: 'y'.repeat(100) },
      { from: 'f', to: 't' },
    )
    expect(mail.subject.endsWith('…')).toBe(true)
    expect('reply_to' in mail).toBe(false)
  })
})

describe('handleFeatureRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  const post = (body: unknown) =>
    new Request('https://tally.test/api/feature-request', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  const env = { RESEND_API_KEY: 'k', FEEDBACK_TO: 'me@example.com' }

  it('answers 503 until configured', async () => {
    const res = await handleFeatureRequest(post({ message: 'hi' }), {})
    expect(res.status).toBe(503)
  })

  it('sends through Resend and answers 204', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handleFeatureRequest(post({ message: 'hi' }), env)
    expect(res.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://api.resend.com/emails')
    expect(JSON.parse(init.body as string)).toMatchObject({
      to: ['me@example.com'],
      text: expect.stringContaining('hi'),
    })
  })

  it('refuses without a passing captcha when Turnstile is set up', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ success: false })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await handleFeatureRequest(
      post({ message: 'hi', captcha: 'bad' }),
      { ...env, TURNSTILE_SECRET_KEY: 's' },
    )
    expect(res.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('answers 400 for an invalid body', async () => {
    const res = await handleFeatureRequest(post({ message: '' }), env)
    expect(res.status).toBe(400)
  })
})
