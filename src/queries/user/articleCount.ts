import { ARTICLE_STATE } from 'common/enums'
import { UserStatusToArticleCountResolver } from 'definitions'

const resolver: UserStatusToArticleCountResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const result = await knex('article as a1')
    .where({ 'a1.author_id': id })
    .whereNotExists(
      knex('article as a2')
        .select(1)
        .whereRaw('a2.draft_id = a1.draft_id')
        .andWhere({
          'a2.state': ARTICLE_STATE.archived,
          'a2.author_id': id,
        })
    )
    .count()
    .first()

  return parseInt(result ? (result.count as string) : '0', 10)
}

export default resolver
