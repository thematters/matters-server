import * as Sentry from '@sentry/node'
import get from 'lodash/get'

export const pushErrorToSentry = (error: any) => {
  const code = get(error, 'extensions.code')

  switch (code) {
    case 'CODE_EXPIRED':
    case 'UNAUTHENTICATED':
    case 'USER_USERNAME_EXISTS':
    case 'USER_PASSWORD_INVALID': {
      // Ingore errors
      break
    }
    default: {
      Sentry.captureException(error)
      break
    }
  }
}
