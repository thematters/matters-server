import { CIRCLE_ACTION } from 'common/enums'
import { numRound } from 'common/utils'
import { CircleFollowerAnalyticsToFollowerPercentageResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToFollowerPercentageResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const [followerCount, readerCountResult] = await Promise.all([
    atomService.count({
      table: 'action_circle',
      where: { targetId: id, action: CIRCLE_ACTION.follow },
    }),
    knex
      .countDistinct('arc.user_id')
      .from('article_read_count as arc')
      .join('article_circle as ac', 'ac.article_id', 'arc.article_id')
      .where({ 'ac.circle_id': id })
      .first(),
  ])

  const readerCount = parseInt(
    readerCountResult ? (readerCountResult.count as string) : '0',
    10
  )

  if (followerCount <= 0) {
    return 0
  }

  if (readerCount <= 0) {
    return 100
  }

  return Math.min(numRound((followerCount / readerCount) * 100), 100)
}

export default resolver
