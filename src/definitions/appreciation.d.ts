import type { APPRECIATION_PURPOSE } from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export interface Appreciation {
  id: string
  uuid?: string
  senderId?: string
  recipientId: string
  amount?: number
  purpose?: ValueOf<typeof APPRECIATION_PURPOSE>
  referenceId?: string
}
