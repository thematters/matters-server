import { ARTICLE_STATE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
// import { environment } from 'common/environment'
import { fromGlobalId } from 'common/utils'
import { publicationQueue } from 'connectors/queue'
import { MutationToUpdateArticleStateResolver } from 'definitions'

const resolver: MutationToUpdateArticleStateResolver = async (
  _,
  { input: { id, state } },
  {
    viewer,
    dataSources: {
      atomService,
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

  const user = await userService.dataloader.load(article.authorId)

  // trigger notification
  if (state === ARTICLE_STATE.banned) {
    notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: user.id,
    })
  }

  const { userName } = user
  publicationQueue.refreshIPNSFeed({ userName })

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
