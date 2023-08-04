import type { GQLCircleContentAnalyticsResolvers } from 'definitions'

import { ARTICLE_ACCESS_TYPE } from 'common/enums'

const resolver: GQLCircleContentAnalyticsResolvers['public'] = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const records = await knex
    .select('ac.article_id as article_id')
    .from('article_circle as ac')
    .innerJoin('article_read_count as arc', 'ac.article_id', 'arc.article_id')
    .where({
      'ac.circle_id': id,
      'ac.access': ARTICLE_ACCESS_TYPE.public,
    })
    .sum('arc.timed_count as readCount')
    .groupBy('ac.article_id')
    .orderBy('readCount', 'desc')
    .limit(10)

  const data = await Promise.all(
    records.map(async ({ articleId, readCount }) => {
      const article = await atomService.findUnique({
        table: 'article',
        where: { id: articleId },
      })
      const node = await atomService.findUnique({
        table: 'draft',
        where: { id: article.draftId },
      })
      return { node, readCount }
    })
  )
  return data
}

export default resolver
