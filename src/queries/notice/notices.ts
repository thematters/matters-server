import {
  connectionFromArray,
  cursorToIndex,
  filterMissingFieldNoticeEdges
} from 'common/utils'
import { UserToNoticesResolver } from 'definitions'

const resolver: UserToNoticesResolver = async (
  { id },
  { input },
  { dataSources: { notificationService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await notificationService.notice.countNotice({
    userId: id
  })
  const notices = await notificationService.notice.findByUser({
    userId: id,
    offset,
    limit: first
  })

  const result = connectionFromArray(notices, input, totalCount)
  const edges = filterMissingFieldNoticeEdges(result.edges)

  return {
    ...result,
    edges
  }
}

export default resolver
