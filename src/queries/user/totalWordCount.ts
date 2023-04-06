import { ARTICLE_STATE } from 'common/enums'
import { UserStatusToTotalWordCountResolver } from 'definitions'

const resolver: UserStatusToTotalWordCountResolver = async (
  { id },
  _,
  { knex }
) => {
  const record = await knex('article as a1')
    .sum('word_count')
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
    .first()

  return parseInt(record && record.sum ? (record.sum as string) : '0', 10) || 0
}

export default resolver
