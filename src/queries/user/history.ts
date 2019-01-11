import { connectionFromPromisedArray } from 'graphql-relay'

import { UserActivityToHistoryResolver } from 'definitions'

const resolver: UserActivityToHistoryResolver = async (
  { id },
  { input },
  { dataSources: { userService, articleService } }
) => {
  const readHistory = await userService.findReadHistory(id)

  const history = Promise.all(
    readHistory.map(async ({ uuid, articleId, createdAt }: any) => {
      const article = await articleService.dataloader.load(articleId)
      return {
        uuid,
        article,
        readAt: createdAt
      }
    })
  )

  return connectionFromPromisedArray(history, input)
}

export default resolver
