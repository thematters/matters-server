import addCollectionsArticles from './addCollectionsArticles.js'
import deleteCollectionArticles from './deleteCollectionArticles.js'
import deleteCollections from './deleteCollections.js'
import { likeCollection, unlikeCollection } from './likeCollection.js'
import putCollection from './putCollection.js'
import reorderCollectionArticles from './reorderCollectionArticles.js'

export default {
  Mutation: {
    putCollection,
    deleteCollections,
    addCollectionsArticles,
    deleteCollectionArticles,
    reorderCollectionArticles,
    likeCollection,
    unlikeCollection,
  },
}
