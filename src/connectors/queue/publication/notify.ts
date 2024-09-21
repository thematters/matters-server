import { AtomService } from 'connectors/atomService'
import { NotificationService } from 'connectors/notificationService'
import { PublishArticleData } from '../publication'
import { NOTICE_TYPE } from 'common/enums'
import { ChainedJob } from './job'

export class Notify extends ChainedJob<PublishArticleData> {
  constructor(
    private readonly noficiationService: NotificationService,
    private readonly atomService: AtomService
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.shared.remember(
      'draft',
      async () => await this.atomService.draftIdLoader.load(draftId)
    )

    const { articleId } = draft
    if (!articleId) {
      throw new Error(`Could not find the article with ID "${articleId}".`)
    }

    const article = await this.shared.remember(
      'article',
      async () => await this.atomService.articleIdLoader.load(articleId)
    )

    this.noficiationService.trigger({
      event: NOTICE_TYPE.article_published,
      recipientId: article.authorId,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })
  }
}
