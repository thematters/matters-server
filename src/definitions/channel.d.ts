import type { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'

export interface Channel {
  id: string
  shortHash: string
  name: string
  note?: string
  providerId: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CampaignChannel {
  id: string
  campaignId: string
  order: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ArticleChannel {
  id: string
  articleId: string
  channelId: string
  score?: number
  isLabeled: boolean
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ArticleChannelJob {
  id: string
  articleId: string
  jobId: string
  state: ARTICLE_CHANNEL_JOB_STATE
  createdAt: Date
  updatedAt: Date
  retriedAt?: Date
}
