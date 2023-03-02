import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { ArticleToAppreciationsReceivedResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  if (take === 0) {
    return connectionFromArray(
      [],
      input,
      await articleService.countAppreciations(articleId)
    )
  }

  const records = await articleService.findAppreciations({
    referenceId: articleId,
    take,
    skip,
  })
  const totalCount = records.length === 0 ? 0 : +records[0].totalCount

  return connectionFromArray(records, input, totalCount)
}

export default resolver
