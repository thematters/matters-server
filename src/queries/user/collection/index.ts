import type { GQLCollectionResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import articles from './articles'
import author from './author'
import contains from './contains'
import cover from './cover'

const schema: GQLCollectionResolvers = {
  id: ({ id }: { id: string }) =>
    toGlobalId({ type: NODE_TYPES.Collection, id }),
  cover,
  articles,
  author,
  contains,
  likeCount: ({ id }, _, { dataSources: { collectionService } }) =>
    collectionService.countLikes(id),
  liked: ({ id }, _, { dataSources: { collectionService }, viewer }) =>
    viewer.id ? collectionService.isLiked(id, viewer.id) : false,
}

export default schema
