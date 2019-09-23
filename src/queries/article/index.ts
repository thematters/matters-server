import slugify from '@matters/slugify'

import { toGlobalId, makeSummary } from 'common/utils'
import { ARTICLE_APPRECIATE_LIMIT } from 'common/enums'

import rootArticle from './rootArticle'
import userArticles from './user/articles'
import tagCount from './tag/count'
import tagArticles from './tag/articles'
import author from './author'
import cover from './cover'
import tags from './tags'
import collection from './collection'
import collectedBy from './collectedBy'
import MAT from './mat'
import subscribed from './subscribed'
import subscribers from './subscribers'
import hasAppreciate from './hasAppreciate'
import appreciationTotal from './appreciationTotal'
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
  Article: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Article', id }),
    topicScore: ({ topicScore }: { topicScore: number }) =>
      topicScore ? Math.round(topicScore) : null,
    slug: ({ slug, title }: { slug: string; title: string }) =>
      slug || slugify(title), // handle missing slug from migration
    summary: ({ content, cover }: { cover?: string; content: string }) =>
      makeSummary(content, cover ? 110 : 140),
    author,
    cover,
    tags,
    collection,
    collectedBy,
    relatedArticles,
    MAT,
    appreciationTotal,
    subscribed,
    subscribers,
    appreciators,
    hasAppreciate,
    appreciatorCount,
    appreciateLimit: () => ARTICLE_APPRECIATE_LIMIT,
    appreciateLeft,
    participants, // not used anymore
    participantCount: () => 50, // not used anymore
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
    inRecommendNewest: articleOSS.inRecommendNewest,
    todayCover: articleOSS.todayCover
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score
  }
}
