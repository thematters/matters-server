export interface PunishRecord {
  id: string
  userId: string
  state: 'banned'
  archived: boolean
  expiredAt: Date
  createdAt: Date
  updatedAt: Date
}
