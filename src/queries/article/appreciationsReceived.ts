import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { ArticleToAppreciationsReceivedResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const records = await articleService.findAppreciations({
    referenceId: articleId,
    take,
    skip,
  })
  const totalCount = records.length === 0 ? 0 : +records[0].totalCount

  return connectionFromArray(records, input, totalCount)
}

export default resolver
