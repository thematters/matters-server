import type {
  GQLWritingChallengeResolvers,
  DataSources,
} from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { connectionFromQuery, fromGlobalId } from '#common/utils/index.js'

const resolver: GQLWritingChallengeResolvers['articles'] = async (
  { id: campaignId },
  { input: { first, after, filter } },
  { dataSources: { campaignService, atomService } }
) => {
  const stageId = filter?.stage
    ? await validateStage(filter.stage, { atomService })
    : undefined

  const query = campaignService.findArticles(campaignId, {
    filterStageId: stageId,
    featured: filter?.featured,
  })

  const connection = await connectionFromQuery({
    query,
    orderBy: { column: 'order', order: 'desc' },
    cursorColumn: 'id',
    args: { first, after },
  })

  return {
    ...connection,
    edges: await Promise.all(
      connection.edges.map(async (edge) => {
        const article = await atomService.findFirst({
          table: 'campaign_article',
          where: { campaignId, articleId: edge.node.id },
        })

        return {
          cursor: edge.cursor,
          node: edge.node,
          featured: article.featured,
          announcement: article.announcement,
        }
      })
    ),
  }
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
