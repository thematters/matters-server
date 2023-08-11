import type { GQLMutationResolvers, UserHasUsername } from 'definitions'

import { ARTICLE_STATE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
// import { environment } from 'common/environment'
import { fromGlobalId } from 'common/utils'
import { publicationQueue } from 'connectors/queue'

const resolver: GQLMutationResolvers['updateArticleState'] = async (
  _,
  { input: { id, state } },
  {
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

  const user = (await userService.loadById(article.authorId)) as UserHasUsername

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
