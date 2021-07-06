import { ArticleToRevisionCountResolver } from 'definitions'

const resolver: ArticleToRevisionCountResolver = async (
  { articleId },
  _,
  { knex }
) => {
  const result = await knex
    .sum('read_time as total')
    .from('article_read_count')
    .where({ articleId })
    .andWhereNot({ readTime: null })
    .groupBy('article_id')
    .first()

  if (!result) {
    return 0
  }

  const total = parseFloat(result.total)

  if (!total || total <= 0) {
    return 0
  }

  return total
}

export default resolver
