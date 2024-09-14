import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { CampaignHandler } from './campaignHandler'
import { Job } from './job'

export class HandleCampaign extends Job<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly handler: CampaignHandler
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    if (! Array.isArray(draft.campaigns)) {
      return
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)

    await this.handler.handle(article, draft.campaigns)
  }
}
