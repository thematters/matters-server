import type { ValueOf } from './generic'

import { JOURNAL_STATE } from 'common/enums'

export interface Journal {
  id: string
  content: string
  authorId: string
  state: ValueOf<typeof JOURNAL_STATE>
  createdAt: Date
  updatedAt: Date
}

export interface JournalAsset {
  id: string
  journalId: string
  assetId: string
  createdAt: Date
  updatedAt: Date
}
