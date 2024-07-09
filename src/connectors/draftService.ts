import type { Draft, Connections } from 'definitions'

import { PUBLISH_STATE, CAMPAIGN_STATE } from 'common/enums'
import {
  UserInputError,
  CampaignNotFoundError,
  CampaignStageNotFoundError,
  ActionFailedError,
} from 'common/errors'
import { BaseService } from 'connectors'

export class DraftService extends BaseService<Draft> {
  public constructor(connections: Connections) {
    super('draft', connections)
  }

  public countByAuthor = async (authorId: string) => {
    const result = await this.knex(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findByPublishState = async ({
    articleIdIsNull,
    publishState,
  }: {
    articleIdIsNull: boolean
    publishState: string
  }) => {
    const query = this.knex.select().from(this.table).where({ publishState })

    if (articleIdIsNull === false) {
      query.whereNotNull('article_id')
    }
    if (articleIdIsNull === true) {
      query.whereNull('article_id')
    }
    return query
  }

  public findUnpublishedByAuthor = (authorId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .andWhereNot({ publishState: PUBLISH_STATE.published })
      .orderBy('updated_at', 'desc')

  public validateCampaigns = async (
    campaigns: Array<{ campaign: string; stage: string }>
  ) => {
    for (const { campaign: campaignId, stage: stageId } of campaigns) {
      const campaign = await this.models.campaignIdLoader.load(campaignId)
      if (!campaign) {
        throw new CampaignNotFoundError('campaign not found')
      }
      if (campaign.state !== CAMPAIGN_STATE.active) {
        throw new ActionFailedError('campaign not active')
      }

      const stage = await this.models.campaignStageIdLoader.load(stageId)
      if (!stage) {
        throw new CampaignStageNotFoundError('stage not found')
      }
      if (stage.campaignId !== campaignId) {
        throw new UserInputError('stage not belong to campaign')
      }
    }
    return campaigns
  }
}
