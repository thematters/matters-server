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
  } catch (error) {
    if (error.extensions) {
      // expected errors
      logger.warn(error.name)
    } else {
      // unexpected errors
      logger.error(error)
    }
    throw error
  }
}
