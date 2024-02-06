export interface Topic {
  id: string
  title: string
  description?: string
  cover?: string
  userId: string
  public: boolean
  order: number
}
