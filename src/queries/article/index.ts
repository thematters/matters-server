import slugify from '@matters/slugify'

import {
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_LICENSE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLArticleLicenseType } from 'definitions'

import * as articleAccess from './access'
import appreciateLeft from './appreciateLeft'
import appreciationsReceived from './appreciationsReceived'
import appreciationsReceivedTotal from './appreciationsReceivedTotal'
import assets from './assets'
import author from './author'
import canSuperLike from './canSuperLike'
import chapterArticleCount from './chapter/articleCount'
import chapterArticles from './chapter/articles'
import chapterTopic from './chapter/topic'
import collectedBy from './collectedBy'
import collection from './collection'
import content from './content'
import articleCover from './cover'
import createdAt from './createdAt'
import hasAppreciate from './hasAppreciate'
import language from './language'
import * as articleOSS from './oss'
import readTime from './readTime'
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
import summary from './summary'
import tagArticles from './tag/articles'
import tagCover from './tag/cover'
import tagCreator from './tag/creator'
import tagEditors from './tag/editors'
import tagFollowers from './tag/followers'
import tagIsFollower from './tag/isFollower'
import tagIsOfficial from './tag/isOfficial'
import * as tagOSS from './tag/oss'
import tagOwner from './tag/owner'
import tagParticipants from './tag/participants'
import tagsRecommended from './tag/recommended'
import tagSelected from './tag/selected'
import tagArticlesSearchResult from './tag/tagArticlesSearchResult'
import tags from './tags'
import topicArticleCount from './topic/articleCount'
import topicArticles from './topic/articles'
import topicAuthor from './topic/author'
import topicChapterCount from './topic/chapterCount'
import topicChapters from './topic/chapters'
import topicCover from './topic/cover'
import topicLatestArticle from './topic/latestArticle'
import transactionsReceivedBy from './transactionsReceivedBy'
import translation from './translation'
import userArticles from './user/articles'
import userTags from './user/tags'
import userTopics from './user/topics'

export default {
  Query: {
    article: rootArticle,
  },
  User: {
    articles: userArticles,
    tags: userTags,
    topics: userTopics,
  },
  Article: {
    // when the Article is duck'ing from a Draft it has articleId,
    // otherwise when articleId is undefined, it's a native Article, just use 'id'
    id: ({ articleId, id }: { articleId: string; id: string }) =>
      toGlobalId({ type: NODE_TYPES.Article, id: articleId ?? id }),
    content,
    summary,
    appreciationsReceived,
    appreciationsReceivedTotal,
    appreciateLimit: () => ARTICLE_APPRECIATE_LIMIT,
    appreciateLeft,
    author,
    cover: articleCover,
    assets,
    collection,
    collectedBy,
    hasAppreciate,
    canSuperLike,
    language,
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
    readTime,
    createdAt,
    revisedAt,
    access: (root: any) => root,
    revisionCount,
    license: ({ license }: { license?: GQLArticleLicenseType }) =>
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
    isOfficial: tagIsOfficial,
    followers: tagFollowers,
    oss: (root: any) => root,
    cover: tagCover,
    participants: tagParticipants,
    recommended: tagsRecommended,
  },
  TagSearchResult: {
    id: ({ id }: { id: string }) => toGlobalId({ type: NODE_TYPES.Tag, id }),
    articles: tagArticlesSearchResult,
    cover: tagCover,
  },
  Topic: {
    id: ({ id }: { id: string }) => toGlobalId({ type: NODE_TYPES.Topic, id }),
    cover: topicCover,
    chapterCount: topicChapterCount,
    articleCount: topicArticleCount,
    chapters: topicChapters,
    articles: topicArticles,
    author: topicAuthor,
    latestArticle: topicLatestArticle,
  },
  Chapter: {
    id: ({ id }: { id: string }) =>
      toGlobalId({ type: NODE_TYPES.Chapter, id }),
    articleCount: chapterArticleCount,
    articles: chapterArticles,
    topic: chapterTopic,
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
