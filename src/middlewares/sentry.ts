import logger from 'common/logger'
import { pushErrorToSentry } from 'common/utils/sentry'

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
