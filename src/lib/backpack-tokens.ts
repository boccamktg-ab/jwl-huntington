import { createHmac } from 'crypto'

export function generateActionUrl(base: string, id: string, action: string) {
  const secret = process.env.BACKPACK_ACTION_SECRET ?? 'fallback-secret'
  const token = createHmac('sha256', secret).update(`${id}:${action}`).digest('hex').slice(0, 16)
  return `${base}/api/backpacks/action?id=${id}&action=${action}&token=${token}`
}

export function verifyActionToken(id: string, action: string, token: string) {
  const secret = process.env.BACKPACK_ACTION_SECRET ?? 'fallback-secret'
  const expected = createHmac('sha256', secret).update(`${id}:${action}`).digest('hex').slice(0, 16)
  return token === expected
}
