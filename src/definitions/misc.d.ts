import type { ValueOf } from './generic'

import {
  SKIPPED_LIST_ITEM_TYPES,
  MATTERS_CHOICE_TOPIC_STATE,
} from 'common/enums'

export interface PunishRecord {
  id: string
  userId: string
  state: 'banned'
  archived: boolean
  expiredAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MattersChoice {
  id: string
  articleId: string
  createdAt: Date
  updatedAt: Date
}

export interface MattersChoiceTopic {
  id: string
  title: string
  articles: string[]
  pinAmount: number
  note: string | null
  state: KeyOf<typeof MATTERS_CHOICE_TOPIC_STATE>
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Blocklist {
  id: string
  uuid: string
  type: ValueOf<typeof SKIPPED_LIST_ITEM_TYPES>
  value: string
  archived: boolean
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SearchHistory {
  id: string
  userId: string | null
  searchKey: string
  archived: boolean | null
  createdAt: Date
}

export interface BlockedSearchKeyword {
  id: string
  searchKey: string
  createdAt: Date
}

export interface LogRecord {
  id: string
  type: string
  userId: string
  readAt: Date
}
