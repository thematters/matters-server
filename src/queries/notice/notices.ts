import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  filterMissingFieldNoticeEdges,
  fromConnectionArgs,
} from 'common/utils'

const MAX_NOTICE_COUNT = 1000

const resolver: GQLUserResolvers['notices'] = async (
  { id },
  { input },
  { dataSources: { notificationService } }
) => {
  const { take: _take, skip } = fromConnectionArgs(input)
  let take = _take
  if (_take + skip > MAX_NOTICE_COUNT) {
    take = Math.max(MAX_NOTICE_COUNT - skip, 0)
  }

  const notices = await notificationService.notice.findByUser({
    userId: id,
    onlyRecent: true,
    skip,
    take,
  })

  const _totalCount = await notificationService.notice.countNotice({
    userId: id,
    onlyRecent: true,
  })
  const totalCount = Math.min(_totalCount, MAX_NOTICE_COUNT)

  const result = connectionFromArray(notices, input, totalCount)
  const edges = filterMissingFieldNoticeEdges(result.edges)

  return {
    ...result,
    edges,
  }
}

export default resolver
