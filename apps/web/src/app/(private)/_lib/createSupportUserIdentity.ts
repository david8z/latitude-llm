import crypto from 'crypto'

import { User } from '@latitude-data/core/browser'
import env from '$/env'

const APP_ID = env.SUPPORT_APP_ID
const SECRET_KEY = env.SUPPORT_APP_SECRET_KEY

function getCredentials() {
  if (!APP_ID || !SECRET_KEY) return

  return {
    appId: APP_ID,
    secretKey: SECRET_KEY,
  }
}

function toUnixTimestampInSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000)
}

export function createSupportUserIdentity(user: User) {
  const credentials = getCredentials()
  if (!credentials) return null

  const { appId, secretKey } = credentials
  const identifier = user.email
  const userHash = crypto
    .createHmac('sha256', secretKey)
    .update(identifier)
    .digest('hex')
  return {
    appId,
    userHash,
    identifier,
    userData: {
      email: user.email,
      name: user.name ?? 'No name',
      id: user.id,
      createdAt: toUnixTimestampInSeconds(user.createdAt),
    },
  }
}

export type SupportUserIdentity = ReturnType<typeof createSupportUserIdentity>