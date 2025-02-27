import type { GQLResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId, fromDatetimeRangeString } from 'common/utils'

import announcements from './announcements'
import application from './application'
import articles from './articles'
import boost from './boost'
import campaign from './campaign'
import campaigns from './campaigns'
import description from './description'
import featuredDescription from './featuredDescription'
import name from './name'
import participants from './participants'
import stageDescription from './stage/description'
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
    featuredDescription,
    announcements,
    cover: ({ cover }, _, { dataSources: { systemService } }) =>
      cover ? systemService.findAssetUrl(cover) : null,
    link: ({ link }) => link ?? '',
    applicationPeriod: ({ applicationPeriod }) => {
      if (!applicationPeriod) {
        return null
      }
      const [start, end] = fromDatetimeRangeString(applicationPeriod as string)
      return { start, end }
    },
    writingPeriod: ({ writingPeriod }) => {
      if (!writingPeriod) {
        return null
      }
      const [start, end] = fromDatetimeRangeString(writingPeriod as string)
      return { start, end }
    },
    stages,
    state: ({ state }) => state,
    application,
    participants,
    articles,
    oss: (root) => root,
  },

  CampaignOSS: {
    boost,
  },

  CampaignStage: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.CampaignStage, id }),
    name: stageName,
    description: stageDescription,
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
