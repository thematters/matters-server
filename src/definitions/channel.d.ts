export interface Channel {
  id: string
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
