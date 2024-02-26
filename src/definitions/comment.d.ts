import type { ValueOf } from './generic'

import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'

export interface Comment {
  id: string
  uuid: string
  authorId: string
  articleId: string | null
  articleVersionId: string | null
  parentCommentId: string | null
  content: string | null
  state: ValueOf<typeof COMMENT_STATE>
  pinned: boolean
  quotationStart: number | null
  quotationEnd: number | null
  quotationContent: string | null
  replyTo: string | null
  remark: string | null
  targetId: string
  targetTypeId: string
  type: ValueOf<typeof COMMENT_TYPE>
  pinnedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface FeaturedCommentMaterialized {
  id: string
  uuid: string
  authorId: string
  articleId: string
  parentCommentId: string
  content: string
  state: string
  pinned: boolean
  quotationStart: number
  quotationEnd: number
  quotationContent: string
  remark: string
  replyTo: string
  targetId: string
  targetTypeId: string
  type: string
  upvotedId: string
  upvoteCount: string
  downvotedId: string
  downvoteCount: string
  score: number
  createdAt: Date
  updatedAt: Date
}
