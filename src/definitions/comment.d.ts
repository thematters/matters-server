import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'

export interface Comment {
  id: string
  uuid: string
  authorId: string
  articleId?: string
  parentCommentId?: string
  content?: string
  state: COMMENT_STATE
  pinned: boolean
  createdAt: string
  updatedAt: string
  quotationStart?: number
  quotationEnd?: number
  quotationContent?: string
  replyTo?: string
  remark?: string
  targetId: string
  targetTypeId: string
  type: COMMENT_STATE
  pinnedAt: string
}
