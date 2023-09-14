import type { GQLArticleResolvers } from 'definitions'

import { USER_ACTION } from 'common/enums'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['subscribers'] = async (
  { articleId },
  { input },
  {
    dataSources: {
      articleService,
      userService,
      connections: { knex },
    },
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [countRecord, actions] = await Promise.all([
    knex('action_article')
      .where({ targetId: articleId, action: USER_ACTION.subscribe })
      .countDistinct('user_id')
      .first(),
    articleService.findSubscriptions({ id: articleId, skip, take }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    userService.loadByIds(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input,
    totalCount
  )
}

export default resolver
