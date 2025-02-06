import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'
export interface Channel {
  id: string
  shortHash: string
  name: string
  description?: string
  providerId: string
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
