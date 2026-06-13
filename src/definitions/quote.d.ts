import type { QUOTE_STATE } from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export interface Quote {
  id: string
  content: string
  articleId: string
  campaignId: string
  userId: string
  state: ValueOf<typeof QUOTE_STATE>
  createdAt: Date
  updatedAt: Date
}
