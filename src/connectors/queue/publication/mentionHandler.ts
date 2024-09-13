import { NOTICE_TYPE } from 'common/enums'
import { extractMentionIds } from 'common/utils'
import { NotificationService } from 'connectors/notificationService'
import { Article } from 'definitions'

export class MentionHandler {
  constructor(
    private readonly notification: NotificationService
  ) {
    //
  }

  async handle(article: Article, content: string): Promise<void> {
    const mentionIds = extractMentionIds(content)

    mentionIds.forEach((id: string) => {
      if (!id) {
        return false
      }

      this.notification.trigger({
        event: NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId: id,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
        tag: `publication:${article.id}`,
      })
    })
  }
}
