import { toGlobalId } from 'common/utils'

import userArticles from './user/articles'
import userMAT from './user/MAT'
import tagCount from './tag/count'
import tagArticles from './tag/articles'
import author from './author'
import cover from './cover'
import summary from './summary'
import tags from './tags'
import content from './content'
import upstream from './upstream'
import downstreams from './downstreams'
import MAT from './MAT'
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
    content,
    gatewayUrls: () => null,
    upstream,
    downstreams,
    relatedArticles: () => null,
    MAT,
    subscribed,
    subscribers,
    appreciators,
    hasAppreciate
  },
  Tag: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Tag', id })
    },
    count: tagCount,
    articles: tagArticles
  }
}
