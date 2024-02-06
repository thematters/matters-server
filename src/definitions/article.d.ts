import {
  ARTICLE_STATE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  PIN_STATE,
} from 'common/enums'

import { LANGUAGES } from './language'

export interface Article {
  id: string
  authorId: string
  state: ARTICLE_STATE
  revisionCount: number
  sensitiveByAdmin: boolean
  pinned: boolean
  pinnedAt: Date | null
  createdAt: Date
  updatedAt: Date
  remark: string | null
}

export interface ArticleVersion {
  id: string
  articleId: string
  title: string
  cover: string | null
  summary: string
  contentId: string
  contentMdId: string | null
  summaryCustomized: boolean
  wordCount: number
  dataHash: string
  mediaHash: string
  pinState: PIN_STATE
  tags: string[]
  connections: string[]
  access: keyof typeof ARTICLE_ACCESS_TYPE
  license: keyof typeof ARTICLE_LICENSE_TYPE
  replyToDonator: string | null
  requestForDonation: string | null
  canComment: boolean
  sensitiveByAuthor: boolean
  sticky: boolean
  language: LANGUAGES | null
  iscnId: string | null
  circleId: string | null
  createdAt: Date
}

export interface ArticleContent {
  id: string
  content: string
  hash: string
}

export interface ArticleCircle {
  id: string
  articleId: string
  circleId: string
  access: keyof typeof ARTICLE_ACCESS_TYPE
  secret?: string
  createdAt: Date
  updatedAt: Date
}

export interface ArticleConnection {
  id: string
  entranceId: string
  articleId: string
  order: number
  createdAt: Date
}

export interface ArticleTag {
  id: string
  articleId: string
  tagId: string
  selected: boolean | null
  creator: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ArticleTopic {
  id: string
  topicId: string
  articleId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface ArticleChapter {
  id: string
  chapterId: string
  articleId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface ArticleRecommendSetting {
  id: string
  articleId: string
  inHottest: boolean
  inNewest: boolean
}
