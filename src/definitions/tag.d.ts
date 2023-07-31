export interface Tag {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  remark?: string
  delete: boolean
  cover?: string
  description?: string
  editor?: string[]
  creator: string
  owner: string
  majorTagId?: string
  slug: string
}
