import logger from 'common/logger.js'

export const sentryMiddleware = async (
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
    // pass error to Sentry via logger
    logger.error(error)
    throw error
  }
}
