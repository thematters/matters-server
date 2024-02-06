export interface Tag {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  remark: string | null
  delete: boolean
  cover: string | null
  description: string | null
  editors: string[] | null
  creator: string
  owner: string
  majorTagId: string | null
  slug: string
}
