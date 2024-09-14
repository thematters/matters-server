import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { MentionHandler } from './mentionHandler'
import { ErrorHandlingJob, Job } from './job'
import { Logger } from 'winston'

export class HandleMention extends Job<PublishArticleData> implements ErrorHandlingJob {
  constructor(
    private readonly atomService: AtomService,
    private readonly handler: MentionHandler,
    private readonly logger?: Logger
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

  handleError(err: unknown): void {
    this.logger?.warn('optional step failed: %j', {
      err,
      draftId: this.job.data.draftId,
      jobId: this.job.id,
    })
  }
}
