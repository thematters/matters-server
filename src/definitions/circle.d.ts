import { CIRCLE_STATE, INVITATION_STATE } from 'common/enums'

import { User } from './user'

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

export interface CircleInvitation {
  id: string
  userId?: string
  circleId: string
  inviter: string
  email: string
  durationInDays: number
  state: INVITATION_STATE
}

export type CircleMember = User & { circleId: string }
