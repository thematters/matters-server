import { CIRCLE_STATE } from 'common/enums'

export interface Circle {
  id: string
  name: string
  cover?: string
  avatar?: string
  state: CIRCLE_STATE
  owner: string
  displayName: string
  description?: string
  provider: string
  providerProductId: string
  createdAt: string
  updatedAt: string
}
