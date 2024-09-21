import { invalidateFQC } from '@matters/apollo-response-cache'
import { NODE_TYPES, NOTICE_TYPE } from 'common/enums'
import { AtomService } from 'connectors/atomService'
import { NotificationService } from 'connectors/notificationService'
import { UserService } from 'connectors/userService'
import { Article, ArticleVersion, Connections } from 'definitions'

export class CircleHandler {
  constructor(
    private readonly userService: UserService,
    private readonly atomService: AtomService,
    private readonly notificationService: NotificationService,
    private readonly redis: Connections['redis']
  ) {
    //
  }

  async handle(article: Article, articleVersion: ArticleVersion, secret?: string): Promise<void> {
    if (!articleVersion.circleId) {
      return
    }

    if (articleVersion.access) {
      await this.#persistAccess(articleVersion, secret)
    }

    this.#notifyCircle(article, articleVersion)

    await invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: articleVersion.circleId },
      redis: this.redis,
    })
  }

  async #persistAccess(articleVersion: ArticleVersion, secret?: string): Promise<void> {
    if (!articleVersion.circleId) {
      return
    }

    const data = {
      articleId: articleVersion.articleId,
      circleId: articleVersion.circleId,
      ...(secret ? { secret } : {}),
    }

    await this.atomService.upsert({
      table: 'article_circle',
      where: data,
      create: { ...data, access: articleVersion.access },
      update: {
        ...data,
        access: articleVersion.access,
      },
    })
  }

  async #notifyCircle(article: Article, articleVersion: ArticleVersion): Promise<void> {
    if (!articleVersion.circleId) {
      return
    }

    // handle 'circle_new_article' notification
    const recipients = await this.userService.findCircleRecipients(
      articleVersion.circleId
    )

    recipients.forEach((recipientId: string) => {
      this.notificationService.trigger({
        event: NOTICE_TYPE.circle_new_article,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })
  }
}
