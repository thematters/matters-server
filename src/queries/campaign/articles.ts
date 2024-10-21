import type { GQLWritingChallengeResolvers, DataSources } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { UserInputError } from 'common/errors'
import { connectionFromQuery, fromGlobalId } from 'common/utils'

const resolver: GQLWritingChallengeResolvers['articles'] = async (
  { id: campaignId },
  { input: { first, after, filter } },
  { dataSources: { campaignService, atomService, systemService } }
) => {
  const stageId = filter?.stage
    ? await validateStage(filter.stage, { atomService })
    : undefined

  const spamThreshold = await systemService.getSpamThreshold()

  const query = campaignService.findArticles(campaignId, {
    filterStageId: stageId,
    featured: filter?.featured,
    spamThreshold,
  })

  return connectionFromQuery({
    query,
    orderBy: { column: 'order', order: 'desc' },
    cursorColumn: 'id',
    args: { first, after },
  })
}

const validateStage = async (
  stageId: string,
  { atomService }: Pick<DataSources, 'atomService'>
) => {
  const { type, id } = fromGlobalId(stageId)
  if (type !== NODE_TYPES.CampaignStage) {
    throw new UserInputError('Invalid stage id')
  }
  const stage = await atomService.findUnique({
    table: 'campaign_stage',
    where: { id },
  })
  if (!stage) {
    throw new UserInputError('Invalid stage id')
  }
  return id
}

export default resolver
