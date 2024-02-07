import type { GQLMutationResolvers, UserHasUsername } from 'definitions'

import { ARTICLE_STATE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateArticleState'] = async (
  _,
  { input: { id, state } },
  { dataSources: { atomService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await atomService.update({
    table: 'article',
    where: { id: dbId },
    data: {
      state,
    },
  })

  const user = (await atomService.userIdLoader.load(
    article.authorId
  )) as UserHasUsername

  // trigger notification
  if (state === ARTICLE_STATE.banned) {
    notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: user.id,
    })
  }
  return article
}

export default resolver
