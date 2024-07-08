import type { GQLResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId, fromDatetimeRangeString } from 'common/utils'

import applicationState from './applicationState'
import campaign from './campaign'
import campaigns from './campaigns'
import description from './description'
import name from './name'
import participants from './participants'
import stageName from './stage/name'
import stages from './stages'

const schema: GQLResolvers = {
  Query: {
    campaign,
    campaigns,
  },
  Campaign: {
    __resolveType: () => 'WritingChallenge',
  },
  WritingChallenge: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Campaign, id }),
    shortHash: ({ shortHash }) => shortHash,
    name,
    description,
    cover: ({ cover }, _, { dataSources: { systemService } }) =>
      cover ? systemService.findAssetUrl(cover) : null,
    link: ({ link }) => link ?? '',
    applicationPeriod: ({ applicationPeriod }) => {
      const [start, end] = fromDatetimeRangeString(applicationPeriod as string)
      return { start, end }
    },
    writingPeriod: ({ writingPeriod }) => {
      const [start, end] = fromDatetimeRangeString(writingPeriod as string)
      return { start, end }
    },
    stages,
    state: ({ state }) => state,
    applicationState,
    participants,
  },

  CampaignStage: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.CampaignStage, id }),
    name: stageName,
    period: ({ period }) => {
      if (!period) {
        return null
      }
      const [start, end] = fromDatetimeRangeString(period)
      return { start, end }
    },
  },
}

export default schema
