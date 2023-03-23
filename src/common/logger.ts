import * as Sentry from '@sentry/node'
import * as fs from 'fs'
import _get from 'lodash/get.js'
import * as path from 'path'
import winston from 'winston'
import Transport from 'winston-transport'

import { isProd, isTest } from 'common/environment.js'

const { createLogger, format, transports } = winston

const logPath = 'logs'

// create logs dir if it does not exist
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath)
}

/**
 * Custom winston transport for Sentry.
 *
 */
class SentryTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts)
  }

  log(info: any, next: () => void) {
    if (info.level === 'error') {
      const code = _get(info, 'extensions.code')

      switch (code) {
        case 'CODE_EXPIRED':
        case 'UNAUTHENTICATED':
        case 'USER_EMAIL_NOT_FOUND':
        case 'USER_USERNAME_EXISTS':
        case 'USER_PASSWORD_INVALID': {
          // Ingore errors
          break
        }
        default: {
          const sentryError = new Error(info.message)
          sentryError.stack = info.stack
          Sentry.captureException(sentryError)
          break
        }
      }
    }
    next()
  }
}

/**
 * Simple format outputs:
 *
 * YYYY-MM-DD HH:mm:ss `${level}: ${message} ${[object]}`
 *
 */
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.printf(
      (info) =>
        `${info.timestamp} ${info.level}: ${JSON.stringify(info.message)}`
    )
  ),
  transports: [
    new transports.File({
      filename: path.join(logPath, 'error.log'),
      level: 'error',
    }),
    new transports.File({ filename: path.join(logPath, 'combined.log') }),
    new SentryTransport({ level: 'error' }),
  ],
})

if (!isProd) {
  logger.add(
    new transports.Console({
      level: isTest ? 'warn' : 'info',
    })
  )
}

export default logger
