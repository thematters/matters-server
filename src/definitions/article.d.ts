import { ARTICLE_STATE } from 'common/enums'

import { LANGUAGES } from './language'

export interface Article {
  id: string
  uuid: string
  authorId: string
  cover?: string
  state: ARTICLE_STATE
  createdAt: Date
  updatedAt: Date
  draftId: string
  remark?: string
  pinnedAt: boolean
  revisionCount: number
}
