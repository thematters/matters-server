import slugify from '@matters/slugify'

import { ARTICLE_APPRECIATE_LIMIT } from 'common/enums'
import { toGlobalId } from 'common/utils'

import appreciateLeft from './appreciateLeft'
import appreciationsReceived from './appreciationsReceived'
import appreciationsReceivedTotal from './appreciationsReceivedTotal'
import assets from './assets'
import author from './author'
import belongTo from './belongTo'
import canSuperLike from './canSuperLike'
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
import rootArticle from './rootArticle'
import state from './state'
import sticky from './sticky'
import subscribed from './subscribed'
import subscribers from './subscribers'
import summary from './summary'
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
      toGlobalId({ type: 'Article', id: articleId }),
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
    summary,
    tags,
    translation,
    topicScore: ({ score }: { score: number }) =>
      score ? Math.round(score) : null,
    transactionsReceivedBy,
    createdAt,
    revisedAt,
    belongTo,
  },
  Tag: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Tag', id }),
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
