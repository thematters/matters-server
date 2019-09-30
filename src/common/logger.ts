import * as fs from 'fs'
import * as path from 'path'
import { createLogger, format, transports } from 'winston'

import { isProd } from 'common/environment'

const logPath = 'logs'

// create logs dir if it does not exist
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath)
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    //
    // The simple format outputs
    // `${level}: ${message} ${[Object with everything else]}`
    //
    format.printf(
      info => `${info.timestamp} ${info.level}: ${JSON.stringify(info.message)}`
    )
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
