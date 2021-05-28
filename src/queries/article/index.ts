import { makeSummary } from '@matters/matters-html-formatter'
import slugify from '@matters/slugify'

import {
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_LICENSE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { toGlobalId } from 'common/utils'

import * as articleAccess from './access'
import appreciateLeft from './appreciateLeft'
import appreciationsReceived from './appreciationsReceived'
import appreciationsReceivedTotal from './appreciationsReceivedTotal'
import assets from './assets'
import author from './author'
import canSuperLike from './canSuperLike'
import circle from './circle'
import collectedBy from './collectedBy'
import collection from './collection'
import content from './content'
import articleCover from './cover'
import createdAt from './createdAt'
import hasAppreciate from './hasAppreciate'
import language from './language'
import live from './live'
import * as articleOSS from './oss'
import relatedArticles from './relatedArticles'
import relatedDonationArticles from './relatedDonationArticles'
import remark from './remark'
import revisedAt from './revisedAt'
import revisionCount from './revisionCount'
import rootArticle from './rootArticle'
import state from './state'
import sticky from './sticky'
import subscribed from './subscribed'
import subscribers from './subscribers'
import tagArticles from './tag/articles'
import tagCover from './tag/cover'
import tagCreator from './tag/creator'
import tagEditors from './tag/editors'
import tagFollowers from './tag/followers'
import tagIsFollower from './tag/isFollower'
import * as tagOSS from './tag/oss'
import tagOwner from './tag/owner'
import tagParticipants from './tag/participants'
import tagSelected from './tag/selected'
import tags from './tags'
import transactionsReceivedBy from './transactionsReceivedBy'
import translation from './translation'
import userArticles from './user/articles'
import userTags from './user/tags'

export default {
  Query: {
    article: rootArticle,
  },
  User: {
    articles: userArticles,
    tags: userTags,
  },
  Article: {
    content,
    summary: ({
      summary,
      content: cont,
    }: {
      summary?: string
      content: string
    }) => summary || makeSummary(cont),
    appreciationsReceived,
    appreciationsReceivedTotal,
    appreciateLimit: () => ARTICLE_APPRECIATE_LIMIT,
    appreciateLeft,
    author,
    cover: articleCover,
    assets,
    collection,
    collectedBy,
    id: ({ articleId }: { articleId: string }) =>
      toGlobalId({ type: NODE_TYPES.Article, id: articleId }),
    hasAppreciate,
    canSuperLike,
    language,
    live,
    oss: (root: any) => root,
    relatedArticles,
    relatedDonationArticles,
    remark,
    slug: ({ slug, title }: { slug: string; title: string }) =>
      slug || slugify(title),
    state,
    sticky,
    subscribed,
    subscribers,
    tags,
    translation,
    topicScore: ({ score }: { score: number }) =>
      score ? Math.round(score) : null,
    transactionsReceivedBy,
    createdAt,
    revisedAt,
    circle,
    access: (root: any) => root,
    revisionCount,
    license: ({ license }: { license: any }) =>
      license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
  },
  Tag: {
    id: ({ id }: { id: string }) => toGlobalId({ type: NODE_TYPES.Tag, id }),
    articles: tagArticles,
    selected: tagSelected,
    creator: tagCreator,
    editors: tagEditors,
    owner: tagOwner,
    isFollower: tagIsFollower,
    followers: tagFollowers,
    oss: (root: any) => root,
    cover: tagCover,
    participants: tagParticipants,
  },
  ArticleAccess: {
    type: articleAccess.type,
    secret: articleAccess.secret,
    circle: articleAccess.circle,
  },
  ArticleOSS: {
    boost: articleOSS.boost,
    score: articleOSS.score,
    inRecommendIcymi: articleOSS.inRecommendIcymi,
    inRecommendHottest: articleOSS.inRecommendHottest,
    inRecommendNewest: articleOSS.inRecommendNewest,
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score,
    selected: tagOSS.selected,
  },
}
