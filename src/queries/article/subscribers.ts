import { USER_ACTION } from 'common/enums'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToSubscribersResolver } from 'definitions'

const resolver: ArticleToSubscribersResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, userService }, knex }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCountResult, actions] = await Promise.all([
    knex('action_article')
      .where({ targetId: articleId, action: USER_ACTION.subscribe })
      .countDistinct('user_id')
      .first(),
    articleService.findSubscriptions({ id: articleId, offset, limit: first }),
  ])

  const totalCount = parseInt(
    totalCountResult ? (totalCountResult.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input,
    totalCount
  )
}

export default resolver
