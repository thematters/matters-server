import { ARTICLE_STATE } from 'common/enums'
import { UserStatusToTotalWordCountResolver } from 'definitions'

const resolver: UserStatusToTotalWordCountResolver = async (
  { id },
  _,
  { knex }
) => {
  const record = await knex('article')
    .sum('word_count')
    .where({ authorId: id, state: ARTICLE_STATE.active })
    .first()

  return parseInt(record && record.sum ? (record.sum as string) : '0', 10) || 0
}

export default resolver
