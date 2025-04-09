import type {
  CAMPAIGN_TYPE,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
} from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export interface Campaign {
  id: string
  shortHash: string
  type: ValueOf<typeof CAMPAIGN_TYPE>
  name: string
  description: string | null
  featuredDescription: string
  link: string | null
  cover: string | null
  applicationPeriod: string | null
  writingPeriod: string | null
  state: ValueOf<typeof CAMPAIGN_STATE>
  creatorId: string
  managerIds: string[] | null
  createdAt: Date
  updatedAt: Date
}

export interface CampaignStage {
  id: string
  campaignId: string
  name: string
  description: string
  featuredDescription: string
  period: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CampaignUser {
  id: string
  campaignId: string
  userId: string
  state: ValueOf<typeof CAMPAIGN_USER_STATE>
  createdAt: Date
  updatedAt: Date
}

export interface CampaignArticle {
  id: string
  campaignId: string
  campaignStageId?: string | null
  articleId: string
  featured: boolean
  announcement: boolean
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CampaignBoost {
  id: string
  campaignId: string
  boost: number
  createdAt: Date
  updatedAt: Date
}
