import * as fs from 'fs'
import * as path from 'path'
import { createLogger, format, transports } from 'winston'

import { isProd } from 'common/environment'
import { pushErrorToSentry } from 'common/utils/sentry'

const logPath = 'logs'

// create logs dir if it does not exist
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath)
}

const sentryLogFilter = format((info, opts) => {
  if (info.level === 'error') {
    pushErrorToSentry(info)
  }
  return info
})

/**
 * Simple format outputs:
 *
 * YYYY-MM-DD HH:mm:ss `${level}: ${message} ${[object]}`
 *
 */
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(
      info => `${info.timestamp} ${info.level}: ${JSON.stringify(info.message)}`
    ),
    sentryLogFilter()
  ),
  transports: [
    new transports.File({
      filename: path.join(logPath, 'error.log'),
      level: 'error'
    }),
    new transports.File({ filename: path.join(logPath, 'combined.log') })
  ]
})

if (!isProd) {
  logger.add(new transports.Console())
}

export default logger
