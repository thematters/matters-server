import type {
  MOMENT_STATE,
  MOMENT_FEED_STATE,
  MOMENT_FEED_REVIEWED_BY,
} from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export interface Moment {
  id: string
  shortHash: string
  content: string
  authorId: string
  state: ValueOf<typeof MOMENT_STATE>
  spamScore: number | null
  isSpam: boolean | null
  isAd: boolean | null
  createdAt: Date
  updatedAt: Date
}

export interface MomentAsset {
  id: string
  momentId: string
  assetId: string
  createdAt: Date
  updatedAt: Date
}

export interface MomentArticle {
  id: string
  momentId: string
  articleId: string
  createdAt: Date
  updatedAt: Date
}

export interface MomentTag {
  id: string
  momentId: string
  tagId: string
  createdAt: Date
  updatedAt: Date
}

export interface MomentFeedUser {
  id: string
  userId: string
  state: ValueOf<typeof MOMENT_FEED_STATE>
  reviewedBy: ValueOf<typeof MOMENT_FEED_REVIEWED_BY> | null
  reviewerId: string | null
  createdAt: Date
  updatedAt: Date
}
