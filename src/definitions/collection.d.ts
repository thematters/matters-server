export interface Collection {
  id: string
  authorId: string
  title: string
  cover?: number
  description?: string
  pinned: boolean
  pinnedAt: string
  createdAt: string
  updatedAt: string
}

export interface CollectionArticle {
  articleId: string
  draftId: string
  order: string
}
