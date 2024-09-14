import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { CampaignHandler } from './campaignHandler'
import { ErrorHandlingJob, ChainedJob } from './job'
import { Logger } from 'winston'

export class HandleCampaign extends ChainedJob<PublishArticleData> implements ErrorHandlingJob {
  constructor(
    private readonly atomService: AtomService,
    private readonly handler: CampaignHandler,
    private readonly logger?: Logger
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

    if (! Array.isArray(draft.campaigns)) {
      return
    }

    const article = await this.shared.remember(
      'article',
      async () => await this.atomService.articleIdLoader.load(articleId)
    )

    await this.handler.handle(article, draft.campaigns)
  }

  handleError(err: unknown): void {
    this.logger?.warn('optional step failed: %j', {
      err,
      draftId: this.job.data.draftId,
      jobId: this.job.id,
    })
  }
}
