import { invalidateFQC } from '@matters/apollo-response-cache'
import { NODE_TYPES } from 'common/enums'
import { CampaignService } from 'connectors/campaignService'
import { Article, Connections } from 'definitions'

export class CampaignHandler {
  constructor(
    private readonly campaign: CampaignService,
    private readonly redis: Connections['redis']
  ) {
    //
  }

  async handle(
    article: Article,
    campaigns: Array<{ campaign: string, stage: string }>
  ): Promise<void> {
    for (const { campaign, stage } of campaigns) {
      await this.campaign.submitArticleToCampaign(article, campaign, stage)

      invalidateFQC({
        node: { type: NODE_TYPES.Campaign, id: campaign },
        redis: this.redis,
      })
    }
  }
}
