import { CIRCLE_ACTION, TAG_ACTION } from 'common/enums'

export interface ActionCircle {
  id: string
  action: CIRCLE_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionTag {
  id: string
  action: TAG_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}
