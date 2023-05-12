import { AsyncLocalStorage } from 'async_hooks'
import { createLogger, format, transports } from 'winston'

export const contextStorage = new AsyncLocalStorage<Map<string, string>>()

const setRequestId = format((info, _) => {
  const context = contextStorage.getStore()
  if (context) {
    info.requestId = context!.get('requestId')
  }
  return info
})

const createWinstonLogger = (name: string) =>
  createLogger({
    level: 'info',
    format: format.combine(
      format.splat(),
      setRequestId(),
      format.label({ label: name }),
      format.errors({ stack: true }),
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.printf(
        (info) =>
          `${info.timestamp} ${info.requestId ?? '-'} ${info.label} ${
            info.level
          }: ${info.message}`
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
