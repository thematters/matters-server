import type { GQLCollectionResolvers } from 'definitions/index.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { toGlobalId } from 'common/utils/index.js'

import articles from './articles.js'
import author from './author.js'
import contains from './contains.js'
import cover from './cover.js'

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
