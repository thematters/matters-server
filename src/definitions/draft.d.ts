import { PIN_STATE, PUBLISH_STATE } from 'common/enums'

import { LANGUAGES } from './language'

export interface Draft {
  id: string
  uuid: string
  authorId: string
  title: string
  cover?: number
  summary?: string
  summaryCustomized: boolean
  wordCount?: string
  dataHash: string
  mediaHash: string
  content: string
  contentMd?: string
  createdAt: string
  updatedAt: string
  articleId: string
  circleId?: string
  collection?: string[]
  tags?: string[]
  remark?: string
  publishState: PUBLISH_STATE
  pinState: PIN_STATE
  archived: boolean
  language?: LANGUAGES
  replyToDonator?: string
  requestForDonation?: string
  iscnId?: string
}
