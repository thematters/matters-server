import { TRANSACTION_TARGET_TYPE } from 'common/enums'
import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
} from 'common/utils'
import { RecommendationToFolloweeDonatedArticlesResolver } from 'definitions'

export const followeeDonatedArticles: RecommendationToFolloweeDonatedArticlesResolver =
  async (
    { id },
    { input },
    { dataSources: { articleService, paymentService, userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { id: type } = await userService.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const keys = cursorToKeys(input.after)
    const [count, actions] = await Promise.all([
      userService.countDedupedFolloweeDonationsByEntity({ id, type }),
      userService.findDedupedFolloweeDonationsByEntity({
        id,
        after: keys.idCursor,
        limit: input.first,
        type,
      }),
    ])
    const txs = (await paymentService.dataloader.loadMany(
      actions.map((action) => action.id)
    )) as Array<Record<string, any>>
    const data = await Promise.all(
      txs.map(async (tx) => {
        const article = await articleService.draftLoader.load(tx.targetId)
        const followee = await userService.dataloader.load(tx.senderId)
        return { __cursor: tx.id, article, followee }
      })
    )
    return connectionFromArrayWithKeys(data, input, count)
  }
