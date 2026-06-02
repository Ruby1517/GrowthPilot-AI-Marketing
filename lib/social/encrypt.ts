import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.SOCIAL_TOKEN_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SOCIAL_TOKEN_SECRET must be at least 32 characters')
  }
  return Buffer.from(secret.slice(0, 32), 'utf8')
}

export function encrypt(plain: string): string {
  const key = getKey()
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decrypt(encoded: string): string {
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64url')
  const iv  = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
