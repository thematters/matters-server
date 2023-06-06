import { getLogger } from 'common/logger'

const logger = getLogger('middleware-logger')

export const loggerMiddleware = async (
  resolve: any,
  root: { [key: string]: any },
  args: any,
  context: any,
  info: any
) => {
  try {
    const result = await resolve(root, args, context, info)
    return result
  } catch (err: any) {
    logger.info('field:%s root:%j args:%j', info.fieldName, root, args)
    if (err.extensions) {
      // expected errors
      logger.warn('%s: %s', err.name, err.message)
    } else {
      // unexpected errors
      logger.error(err)
    }
    throw err
  }
}
