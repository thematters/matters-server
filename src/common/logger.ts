import type { ValueOf, TableName } from 'definitions'

import { AsyncLocalStorage } from 'async_hooks'
import util from 'node:util'
import { createLogger, format, transports } from 'winston'

import { LOGGING_CONTEXT_KEY, LOGGING_LEVEL } from 'common/enums'
import { environment } from 'common/environment'

export type LoggingLevel = ValueOf<typeof LOGGING_LEVEL>
export type LoggingContextKey = ValueOf<typeof LOGGING_CONTEXT_KEY>

export const contextStorage = new AsyncLocalStorage<
  Map<LoggingContextKey, string>
>()

const setContext = format((info, _) => {
  const context = contextStorage.getStore()
  if (context) {
    info.requestId = context!.get('requestId')
    // info.jobId = context!.get('jobId')
  }
  return info
})

// use similar logic from format.simple() to also print anything else of format args
// https://github.com/winstonjs/logform/blob/master/simple.js
const customFormatter = format.printf(
  ({ timestamp, requestId, label, level, message, stack, ...rest }) =>
    `${timestamp} ${requestId ?? '-'} ${label} [${level}]: ${message} ${
      stack ?? ''
    } ${Object.keys(rest).length === 0 ? '' : util.format(rest)}`.trimEnd()
)

const createWinstonLogger = (name: string, level: LoggingLevel) =>
  createLogger({
    level,
    format: format.combine(
      format.splat(),
      format.errors({ stack: true }),
      setContext(),
      format.label({ label: name }),
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      customFormatter
    ),
    transports: [new transports.Console({ level })],
  })

const loggers = new Map()

export const getLogger = (name: string) => {
  const logger = loggers.get(name)
  if (logger) {
    return logger
  }
  const level = environment.debug.includes(name)
    ? LOGGING_LEVEL.debug
    : (environment.loggingLevel as LoggingLevel)
  const newLogger = createWinstonLogger(name, level)
  loggers.set(name, newLogger)
  return newLogger
}

// audit logs helper. note that there is a lambda function load audit logs into RDS for analytis usage

const auditLogger = getLogger('audit-log')

export const auditLog = (data: {
  actorId: string | null
  action: string
  entity?: TableName
  entityId?: string
  oldValue?: string | null
  newValue?: string
  status?: 'succeeded' | 'failed' | 'pending'
  remark?: string
}) => auditLogger.info('%j', data)

// print environment

getLogger('env').debug('environment %s', environment)
