import { ARTICLE_STATE } from 'common/enums'

import { LANGUAGES } from './language'

export interface Article {
  id: string
  uuid: string
  authorId: string
  title: string
  slug: string
  cover?: number
  summary: string
  wordCount: string
  dataHash: string
  mediaHash: string
  content: string
  state: ARTICLE_STATE
  public: boolean
  live: boolean
  createdAt: string
  updatedAt: string
  draftId: string
  remark?: string
  sticky: boolean
  language?: LANGUAGES
  revisionCount: string
  iscnId?: string
}
