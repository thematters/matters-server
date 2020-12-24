import { ARTICLE_STATE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateArticleStateResolver } from 'definitions'

const resolver: MutationToUpdateArticleStateResolver = async (
  _,
  { input: { id, state } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      draftService,
      notificationService,
    },
  }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await articleService.baseUpdate(dbId, {
    state,
    updatedAt: new Date(),
  })

  // trigger notification
  if (state === ARTICLE_STATE.banned) {
    const user = await userService.dataloader.load(article.authorId)
    notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: user.id,
    })
  }

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
