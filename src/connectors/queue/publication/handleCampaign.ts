import Bull from 'bull'
import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { CampaignHandler } from './campaignHandler'

export class HandleCampaign {
  constructor(
    private readonly atomService: AtomService,
    private readonly handler: CampaignHandler
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

    await this.handler.handle(article, draft.campaigns)
  }
}
