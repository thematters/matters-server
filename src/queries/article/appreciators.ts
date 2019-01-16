import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToAppreciatorsResolver } from 'definitions'

const resolver: ArticleToAppreciatorsResolver = async (
  { id },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countAppreciators(id)
  const appreciators = await articleService.findAppreciators({
    id,
    limit: first,
    offset
  })
  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      appreciators.map(({ senderId }: { senderId: string }) => senderId)
    ),
    input,
    totalCount
  )
}

export default resolver
