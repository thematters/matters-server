import type { GQLResolvers } from 'definitions/index.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { toGlobalId, fromDatetimeRangeString } from 'common/utils/index.js'

import announcements from './announcements.js'
import application from './application.js'
import articles from './articles.js'
import boost from './boost.js'
import campaign from './campaign.js'
import campaigns from './campaigns.js'
import description from './description.js'
import featuredDescription from './featuredDescription.js'
import name from './name.js'
import participants from './participants.js'
import stageDescription from './stage/description.js'
import stageName from './stage/name.js'
import stages from './stages.js'

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
