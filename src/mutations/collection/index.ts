import addCollectionsArticles from './addCollectionsArticles'
import deleteCollectionArticles from './deleteCollectionArticles'
import deleteCollections from './deleteCollections'
import putCollection from './putCollection'
import reorderCollectionArticles from './reorderCollectionArticles'

export default {
  Mutation: {
    putCollection,
    deleteCollections,
    addCollectionsArticles,
    deleteCollectionArticles,
    reorderCollectionArticles,
  },
}
