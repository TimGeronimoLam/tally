// Generates a VAPID key pair for the daily push reminder (README → Reminders).
// No dependencies. Run once: node scripts/gen-vapid.mjs
// The public key goes to VITE_VAPID_PUBLIC_KEY (build) and VAPID_PUBLIC_KEY
// (Worker); the private key only to the Worker secret VAPID_PRIVATE_KEY.
import { generateKeyPairSync } from 'node:crypto'

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const jwk = privateKey.export({ format: 'jwk' })

// Uncompressed point 0x04 ‖ x ‖ y, as PushManager.subscribe() wants it.
const publicKey = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(jwk.x, 'base64url'),
  Buffer.from(jwk.y, 'base64url'),
]).toString('base64url')

console.log(`VAPID public key (VITE_VAPID_PUBLIC_KEY and VAPID_PUBLIC_KEY):
${publicKey}

VAPID private key (VAPID_PRIVATE_KEY, Worker secret only):
${jwk.d}`)
