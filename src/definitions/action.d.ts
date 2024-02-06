import { CIRCLE_ACTION } from 'common/enums'

export interface ActionCircle {
  id: string
  action: CIRCLE_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}
