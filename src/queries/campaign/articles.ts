import type { GQLWritingChallengeResolvers, DataSources } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { UserInputError } from 'common/errors'
import {
  connectionFromArray,
  fromConnectionArgs,
  fromGlobalId,
} from 'common/utils'

const resolver: GQLWritingChallengeResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { campaignService, atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const { filter } = input
  const stageId = filter?.stage
    ? await validateStage(filter.stage, { atomService })
    : undefined

  const [participants, totalCount] = await campaignService.findAndCountArticles(
    id,
    { take, skip },
    { filterStageId: stageId }
  )
  return connectionFromArray(participants, input, totalCount)
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
