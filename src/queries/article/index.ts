import { toGlobalId } from 'common/utils'
import { ARTICLE_APPRECIATE_LIMIT } from 'common/enums'

import rootArticle from './rootArticle'
import userArticles from './user/articles'
import userMAT from './user/mat'
import tagCount from './tag/count'
import tagArticles from './tag/articles'
import author from './author'
import cover from './cover'
import tags from './tags'
import upstream from './upstream'
import downstreams from './downstreams'
import MAT from './mat'
import subscribed from './subscribed'
import subscribers from './subscribers'
import hasAppreciate from './hasAppreciate'
import appreciatorCount from './appreciatorCount'
import appreciateLeft from './appreciateLeft'
import participants from './participants'
import appreciators from './appreciators'
import relatedArticles from './relatedArticles'
import * as articleOSS from './oss'
import * as tagOSS from './tag/oss'

export default {
  Query: {
    article: rootArticle
  },
  User: {
    articles: userArticles
  },
  UserStatus: {
    MAT: userMAT
  },
  Article: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Article', id }),
    topicScore: ({ topicScore }: { topicScore: number }) =>
      topicScore ? Math.round(topicScore) : null,
    author,
    cover,
    tags,
    upstream,
    downstreams,
    relatedArticles,
    MAT,
    mediaHash: ({ dataHash }: { dataHash: string }) => dataHash, // TODO: remove in production
    subscribed,
    subscribers,
    appreciators,
    hasAppreciate,
    appreciatorCount,
    appreciateLimit: () => ARTICLE_APPRECIATE_LIMIT,
    appreciateLeft,
    participants, // TODO
    participantCount: () => 50, // TODO
    oss: (root: any) => root
  },
  Tag: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Tag', id }),
    count: tagCount,
    articles: tagArticles,
    oss: (root: any) => root
  },
  ArticleOSS: {
    boost: articleOSS.boost,
    score: articleOSS.score,
    inRecommendToday: articleOSS.inRecommendToday,
    inRecommendIcymi: articleOSS.inRecommendIcymi,
    inRecommendHottest: articleOSS.inRecommendHottest,
    inRecommendNewest: articleOSS.inRecommendNewest
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score
  }
}
