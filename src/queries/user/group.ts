import logger from 'common/logger'
import { UserInfoToGroupResolver } from 'definitions'

const resolver: UserInfoToGroupResolver = async ({ id }, _, { viewer }) => {
  let num = 0
  try {
    if (viewer.id) {
      num = parseInt(viewer.id, 10) || 0
    } else if (viewer.ip) {
      num = viewer.ip.split(/[.:]/).reduce((sum, chunk) => {
        return sum + (parseInt(chunk, 10) || 0)
      }, 0)
    }
  } catch (error) {
    logger.error(error)
  }
  return num % 2 === 0 ? 'a' : 'b'
}

export default resolver
