import {
  connectionFromArray,
  filterMissingFieldNoticeEdges,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { UserToNoticesResolver } from 'definitions'

const resolver: UserToNoticesResolver = async (
  { id },
  { input },
  { dataSources: { notificationService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await notificationService.notice.countNotice({
    userId: id,
  })
  const notices = await notificationService.notice.findByUser({
    userId: id,
    skip,
    take,
  })

  const result = connectionFromArray(notices, input, totalCount)
  const edges = filterMissingFieldNoticeEdges(result.edges)

  return {
    ...result,
    edges,
  }
}

export default resolver
