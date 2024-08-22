import type { ValueOf } from './generic'

import {
  CAMPAIGN_TYPE,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
} from 'common/enums'

export interface Campaign {
  id: string
  shortHash: string
  type: ValueOf<typeof CAMPAIGN_TYPE>
  name: string
  description: string | null
  link: string | null
  cover: string | null
  applicationPeriod: string | null
  writingPeriod: string | null
  state: ValueOf<typeof CAMPAIGN_STATE>
  creatorId: string
  createdAt: Date
  updatedAt: Date
}

export interface CampaignStage {
  id: string
  campaignId: string
  name: string
  description: string
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
  campaignStageId: string | null
  articleId: string
  createdAt: Date
}

export interface CampaignBoost {
  id: string
  campaignId: string
  boost: number
  createdAt: Date
  updatedAt: Date
}
