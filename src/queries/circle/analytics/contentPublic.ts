import { ForbiddenError } from 'common/errors'
import {
  CircleContentAnalyticsToPublicResolver,
  GQLArticleAccessType,
} from 'definitions'

const resolver: CircleContentAnalyticsToPublicResolver = async (
  { id, owner },
  _,
  { dataSources: { atomService }, knex, viewer }
) => {
  if (!viewer.id || owner !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const records = await knex
    .select('ac.article_id as article_id')
    .from('article_circle as ac')
    .innerJoin('article_read_count as arc', 'ac.article_id', 'arc.article_id')
    .where({
      'ac.circle_id': id,
      'ac.access': GQLArticleAccessType.public,
    })
    .sum('arc.timed_count as count')
    .groupBy('ac.article_id')
    .orderBy('count', 'desc')
    .limit(10)

  const data = await Promise.all(
    records.map(async ({ articleId, count }) => {
      const node = atomService.findUnique({
        table: 'article',
        where: { id: articleId },
      })
      return { node, readCount: count }
    })
  )

  return data
}

export default resolver
