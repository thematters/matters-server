import { APPRECIATION_PURPOSE } from 'common/enums'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { ArticleToAppreciationsReceivedResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const record = await knex
    .select()
    .from((kx: any) => {
      const source = kx
        .select('reference_id', 'sender_id')
        .from('appreciation')
        .where({
          referenceId: articleId,
          purpose: APPRECIATION_PURPOSE.appreciate,
        })
        .groupBy('sender_id', 'reference_id')
      source.as('source')
    })
    .count()
    .first()
  const totalCount = parseInt(record.count || '0', 10)

  return connectionFromPromisedArray(
    articleService.findAppreciations({
      referenceId: articleId,
      take,
      skip,
    }),
    input,
    totalCount
  )
}

export default resolver
