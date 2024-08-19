import type { GQLWritingChallengeResolvers, DataSources } from 'definitions'

import { NODE_TYPES, DEFAULT_TAKE_PER_PAGE } from 'common/enums'
import { UserInputError } from 'common/errors'
import {
  connectionFromArrayWithKeys,
  cursorToKeys,
  fromGlobalId,
} from 'common/utils'

const resolver: GQLWritingChallengeResolvers['articles'] = async (
  { id: campaignId },
  { input: { first, after, filter } },
  { dataSources: { campaignService, atomService } }
) => {
  const stageId = filter?.stage
    ? await validateStage(filter.stage, { atomService })
    : undefined

  const [campaignArticles, totalCount] =
    await campaignService.findAndCountArticles(
      campaignId,
      {
        take: first ?? DEFAULT_TAKE_PER_PAGE,
        skip: after ? cursorToKeys(after).idCursor : undefined,
      },
      { filterStageId: stageId }
    )
  const nodes = await Promise.all(
    campaignArticles.map(async ({ articleId, id }) => {
      const article = await atomService.articleIdLoader.load(articleId)
      return { ...article, __cursor: id }
    })
  )
  return connectionFromArrayWithKeys(nodes, { after }, totalCount)
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
