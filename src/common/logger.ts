import { createLogger, format, transports } from 'winston'

import { isProd } from 'common/environment'

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
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
})

if (!isProd) {
  logger.add(new transports.Console())
}

export default logger
