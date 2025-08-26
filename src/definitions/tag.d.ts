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
  owner: string | null
  majorTagId: string | null
  slug: string
}

export interface TagBoost {
  id: string
  tagId: string
  boost: number
  createdAt: Date
  updatedAt: Date
}

export interface UserTagsOrder {
  id: string
  userId: string
  tagIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TagTranslation {
  id: string
  tagId: string
  language: string
  content: string
  createdAt: Date
  updatedAt: Date
}
