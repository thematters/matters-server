import {
  ARTICLE_STATE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
} from 'common/enums'
import { Classification } from 'connectors/classification/manager'

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
  shortHash: string
  spamScore: number | null
  isSpam: boolean | null
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
  tags: string[]
  connections: string[]
  access: keyof typeof ARTICLE_ACCESS_TYPE
  license: keyof typeof ARTICLE_LICENSE_TYPE
  replyToDonator: string | null
  requestForDonation: string | null
  canComment: boolean
  sensitiveByAuthor: boolean
  sticky: boolean
  language: string | null
  iscnId: string | null
  circleId: string | null
  description: string | null
  indentFirstLine: boolean
  createdAt: Date
  updatedAt: Date
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

export interface ArticleRecommendSetting {
  id: string
  articleId: string
  inHottest: boolean
  inNewest: boolean
  inSearch: boolean
}

export interface ArticleBoost {
  id: string
  articleId: string
  boost: number
  createdAt: Date
  updatedAt: Date
}

export interface ArticleTranslation {
  id: string
  articleId: string
  articleVersionId: string
  language: string
  title: string
  content: string
  summary: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ArticleCountView {
  id
  commentsTotal
  commenters7d
  commenters1d
  recentCommentSince
  score
}

export interface ArticleReadTimeMaterialized {
  id: string
  articleId: string
  sumReadTime: string
}

export interface RecommendedArticlesFromReadTagsMaterialized {
  id: string
  userId: string
  articleId: string
  tagsBased: string[]
  score: number
}

export interface ArticleHottestView {
  id: string
  score: number
  scorePrev: number
  link: string
  tagBoostEff: number
  campaignBoostEff: number
  createdAt: Date
}

export interface ArticleClassification {
  id: string
  articleVersionId: string
  classification: Classification
}
