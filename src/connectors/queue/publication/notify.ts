import Bull from 'bull'
import { AtomService } from 'connectors/atomService'
import { NotificationService } from 'connectors/notificationService'
import { PublishArticleData } from '../publication'
import { NOTICE_TYPE } from 'common/enums'

export class Notify {
  constructor(
    private readonly noficiationService: NotificationService,
    private readonly atomService: AtomService
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>): Promise<any> {
    const { draftId } = job.data

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
