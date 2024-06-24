import type { ValueOf } from './generic'

import { MOMENT_STATE } from 'common/enums'

export interface Moment {
  id: string
  content: string
  authorId: string
  state: ValueOf<typeof MOMENT_STATE>
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
