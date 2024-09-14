import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { MentionHandler } from './mentionHandler'
import { Job } from './job'

export class HandleMention extends Job<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly handler: MentionHandler
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

    await this.handler.handle(article, draft.content)

    await this.job.progress(60)
  }
}
