export interface Chapter {
  id: string
  title?: string
  description?: string
  topicId?: string
  order: number
  createdAt: Date
  updatedAt: Date
}
