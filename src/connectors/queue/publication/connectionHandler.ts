import { NOTICE_TYPE } from 'common/enums'
import { ArticleService } from 'connectors/articleService'
import { AtomService } from 'connectors/atomService'
import { NotificationService } from 'connectors/notificationService'
import { Article, ArticleConnection, ArticleVersion } from 'definitions'
import { Logger } from 'winston'

export class ConnectionHandler {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly notificationService: NotificationService,
    private readonly logger?: Logger
  ) {
    //
  }

  async handle(article: Article, articleVersion: ArticleVersion): Promise<void> {
    if (articleVersion.connections.length === 0) {
      return
    }

    const items = articleVersion.connections.map(
      (articleId: string, index: number) => ({
        entranceId: article.id,
        articleId,
        order: index,
      })
    )

    await this.articleService.baseBatchCreate<ArticleConnection>(
      items,
      'article_connection'
    )

    // trigger notifications
    articleVersion.connections.forEach(async (id: string) => {
      const connection = await this.atomService.findUnique({
        table: 'article',
        where: { id },
      })

      if (!connection) {
        this.logger?.warn(`article connection not found: ${id}`)

        return
      }

      this.notificationService.trigger({
        event: NOTICE_TYPE.article_new_collected,
        recipientId: connection.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: connection },
          {
            // TODO: rename to 'connection' and migrate notice_entity table
            type: 'collection',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })
  }
}
