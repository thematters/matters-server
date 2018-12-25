import { toGlobalId } from 'common/utils'

import userArticles from './user/articles'
import userMAT from './user/mat'
import tagCount from './tag/count'
import tagArticles from './tag/articles'
import author from './author'
import cover from './cover'
import summary from './summary'
import tags from './tags'
import upstream from './upstream'
import downstreams from './downstreams'
import MAT from './mat'
import subscribed from './subscribed'
import subscribers from './subscribers'
import hasAppreciate from './hasAppreciate'
import appreciators from './appreciators'

export default {
  User: {
    articles: userArticles
  },
  UserStatus: {
    MAT: userMAT
  },
  Article: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Article', id }),
    author,
    cover,
    summary,
    tags,
    gatewayUrls: () => [],
    upstream,
    downstreams,
    relatedArticles: () => [],
    MAT,
    subscribed,
    subscribers,
    appreciators,
    hasAppreciate,
    participantCount: () => 50 // TODO
  },
  Tag: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Tag', id })
    },
    count: tagCount,
    articles: tagArticles
  }
}
