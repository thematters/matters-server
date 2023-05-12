import { getLogger } from 'common/logger'

const logger = getLogger('resolver')

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
    logger.error(error)
    throw error
  }
}
