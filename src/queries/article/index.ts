import slugify from '@matters/slugify'

import { ARTICLE_APPRECIATE_LIMIT } from 'common/enums'
import { makeSummary, toGlobalId } from 'common/utils'

import appreciateLeft from './appreciateLeft'
import appreciationsReceived from './appreciationsReceived'
import appreciationsReceivedTotal from './appreciationsReceivedTotal'
import author from './author'
import collectedBy from './collectedBy'
import collection from './collection'
import content from './content'
import articleCover from './cover'
import hasAppreciate from './hasAppreciate'
import * as articleOSS from './oss'
import relatedArticles from './relatedArticles'
import rootArticle from './rootArticle'
import subscribed from './subscribed'
import subscribers from './subscribers'
import tagArticles from './tag/articles'
import * as tagOSS from './tag/oss'
import tagSelected from './tag/selected'
import tags from './tags'
import transactionsReceivedBy from './transactionsReceivedBy'
import ArticleTranslation from './translation'
import userArticles from './user/articles'

export default {
  Query: {
    article: rootArticle,
  },
  User: {
    articles: userArticles,
  },
  Article: {
    content,
    appreciationsReceived,
    appreciationsReceivedTotal,
    appreciateLimit: () => ARTICLE_APPRECIATE_LIMIT,
    appreciateLeft,
    author,
    cover: articleCover,
    collection,
    collectedBy,
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Article', id }),
    hasAppreciate,
    oss: (root: any) => root,
    relatedArticles,
    slug: ({ slug, title }: { slug: string; title: string }) =>
      slug || slugify(title), // handle missing slug from migration
    subscribed,
    subscribers,
    summary: ({
      content: articleContent,
      cover,
    }: {
      cover?: string
      content: string
    }) => makeSummary(articleContent, cover ? 110 : 140),
    tags,
    translation: (root: any) => root,
    topicScore: ({ topicScore }: { topicScore: number }) =>
      topicScore ? Math.round(topicScore) : null,
    transactionsReceivedBy,
  },
  ArticleTranslation,
  Tag: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Tag', id }),
    articles: tagArticles,
    selected: tagSelected,
    oss: (root: any) => root,
  },
  ArticleOSS: {
    boost: articleOSS.boost,
    score: articleOSS.score,
    inRecommendToday: articleOSS.inRecommendToday,
    inRecommendIcymi: articleOSS.inRecommendIcymi,
    inRecommendHottest: articleOSS.inRecommendHottest,
    inRecommendNewest: articleOSS.inRecommendNewest,
    todayCover: articleOSS.todayCover,
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score,
  },
}
