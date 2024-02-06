export interface Collection {
  id: string
  authorId: string
  title: string
  cover?: string
  description?: string
  pinned: boolean
  pinnedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CollectionArticle {
  articleId: string
  draftId: string
  order: string
}
