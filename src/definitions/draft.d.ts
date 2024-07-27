import {
  PUBLISH_STATE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
} from 'common/enums'

import { LANGUAGES } from './language'

export interface Draft {
  id: string
  authorId: string
  title: string
  cover: string | null
  summary: string | null
  content: string
  contentMd: string | null
  dataHash: string | null
  mediaHash: string | null
  circleId: string | null
  collection: string[] | null
  tags: string[]
  language: LANGUAGES | null
  access: keyof typeof ARTICLE_ACCESS_TYPE
  license: keyof typeof ARTICLE_LICENSE_TYPE
  replyToDonator: string | null
  requestForDonation: string | null
  canComment: boolean
  iscnPublish: boolean | null
  remark: string | null
  publishState: PUBLISH_STATE
  articleId: string | null
  sensitiveByAuthor: boolean
  archived: boolean
  campaigns: any
  createdAt: Date
  updatedAt: Date
}
