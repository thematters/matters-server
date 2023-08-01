import { APPRECIATION_PURPOSE } from 'common/enums'

import { ValueOf } from './generic'

export interface Appreciation {
  id: string
  uuid?: string
  senderId?: string
  recipientId: string
  amount?: number
  purpose?: ValueOf<typeof APPRECIATION_PURPOSE>
  referenceId?: string
}
