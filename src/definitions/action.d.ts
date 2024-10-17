import {
  CIRCLE_ACTION,
  TAG_ACTION,
  USER_ACTION,
  ARTICLE_ACTION,
} from 'common/enums'

export interface ActionCircle {
  id: string
  action: CIRCLE_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionTag {
  id: string
  action: TAG_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionArticle {
  id: string
  action: ARTICLE_ACTION
  userId: string
  targetId: string
  articleVersionId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionComment {
  id: string
  action: 'up_vote' | 'down_vote'
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionUser {
  id: string
  action: USER_ACTION
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionMoment {
  id: string
  action: 'like'
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}

export interface ActionCollection {
  id: string
  action: 'like'
  userId: string
  targetId: string
  createdAt: Date
  updatedAt: Date
}
