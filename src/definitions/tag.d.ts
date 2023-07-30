export interface Tag {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  remark?: string
  delete: boolean
  cover?: number
  description?: string
  editor?: string[]
  creator: string
  owner: string
  major_tag_id?: string
  slug: string
}
