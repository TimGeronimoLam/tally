/** Invite codes: 6 characters from an alphabet without look-alikes. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export function generateInviteCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  }
  return code
}

/** Uppercase, strip spaces/dashes and an optional "TALLY-" prefix. */
export function normalizeInviteCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^TALLY[-\s]*/, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function isValidInviteCode(code: string): boolean {
  return (
    code.length === CODE_LENGTH &&
    [...code].every((ch) => CODE_ALPHABET.includes(ch))
  )
}

/** Join URL for a code, on the current origin. */
export function inviteUrl(code: string, origin = window.location.origin) {
  return `${origin}/join/${code}`
}
