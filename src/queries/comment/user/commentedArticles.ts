import type { GQLUserResolvers } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['commentedArticles'] = async (
  { id },
  { input },
  { dataSources: { draftService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const base = knex
    .max('comment.id', { as: '_comment_id_' })
    .select('article.*')
    .from('comment')
    .innerJoin('article', 'comment.target_id', 'article.id')
    .where({
      'comment.author_id': id,
      'comment.type': COMMENT_TYPE.article,
      'comment.state': COMMENT_STATE.active,
    })
    .groupBy('article.id')
    .orderBy('_comment_id_', 'desc')

  const countQuery = knex.count().from(base.as('base')).first()
  const articlesQuery = base.clone().offset(skip).limit(take)

  const [count, articles] = await Promise.all([countQuery, articlesQuery])
  const totalCount = parseInt(count ? (count.count as string) : '0', 10)

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}

export default resolver
