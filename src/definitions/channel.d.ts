import type {
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
} from '#common/enums/channel.js'
import type { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export interface TopicChannel {
  id: string
  shortHash: string
  name: string
  note?: string
  providerId: string | null
  parentId: string | null
  pinnedArticles: string[]
  enabled: boolean
  order: number
  navbarTitle: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CampaignChannel {
  id: string
  campaignId: string
  order: number
  enabled: boolean
  navbarTitle: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TagChannel {
  id: string
  tagId: string
  order: number
  enabled: boolean
  navbarTitle: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TopicChannelArticle {
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

export interface CurationChannel {
  id: string
  shortHash: string
  name: string
  note: string | null
  pinAmount: number
  color: ValueOf<typeof CURATION_CHANNEL_COLOR>
  activePeriod: string
  order: number
  state: ValueOf<typeof CURATION_CHANNEL_STATE>
  navbarTitle: string | null
  showRecommendation: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CurationChannelArticle {
  id: string
  channelId: string
  articleId: string
  pinned: boolean
  pinnedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
