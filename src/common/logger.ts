import _get from 'lodash/get'
import { createLogger, format, transports } from 'winston'

// import { isProd } from 'common/environment'

/**
 * Simple format outputs:
 *
 * YYYY-MM-DD HH:mm:ss `${level}: ${message} ${[object]}`
 *
 */

const getContext = format((info, _) => {
  info.context = { requestId: 'test-request-id' }
  return info
})

const createWinstonLogger = (name: string) =>
  createLogger({
    level: 'info',
    format: format.combine(
      format.splat(),
      getContext(),
      format.label({ label: name }),
      format.errors({ stack: true }),
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.printf(
        (info) =>
          `${info.timestamp} ${info.label} ${info.context.requestId} ${
            info.level
          }: ${JSON.stringify(info.message)}`
      )
    ),
    transports: [new transports.Console({ level: 'info' })],
  })

const loggers = new Map()

export const getLogger = (name: string) => {
  const logger = loggers.get(name)
  if (logger) {
    return logger
  }
  const newLogger = createWinstonLogger(name)
  loggers.set(name, newLogger)
  return newLogger
}
