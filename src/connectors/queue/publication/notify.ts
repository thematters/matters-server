import { AtomService } from 'connectors/atomService'
import { NotificationService } from 'connectors/notificationService'
import { PublishArticleData } from '../publication'
import { NOTICE_TYPE } from 'common/enums'
import { Job } from './job'

export class Notify extends Job<PublishArticleData> {
  constructor(
    private readonly noficiationService: NotificationService,
    private readonly atomService: AtomService
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)

    this.noficiationService.trigger({
      event: NOTICE_TYPE.article_published,
      recipientId: article.authorId,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })
  }
}
