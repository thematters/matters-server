import slugify from '@matters/slugify'

import {
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_LICENSE_TYPE,
  NODE_TYPES,
} from 'common/enums/index.js'
import logger from 'common/logger.js'
import { toGlobalId } from 'common/utils/index.js'
import { GQLArticleLicenseType } from 'definitions'

import * as articleAccess from './access/index.js'
import appreciateLeft from './appreciateLeft.js'
import appreciationsReceived from './appreciationsReceived.js'
import appreciationsReceivedTotal from './appreciationsReceivedTotal.js'
import assets from './assets.js'
import author from './author.js'
import availableTranslations from './availableTranslations.js'
import canSuperLike from './canSuperLike.js'
import chapterArticleCount from './chapter/articleCount.js'
import chapterArticles from './chapter/articles.js'
import chapterTopic from './chapter/topic.js'
import collectedBy from './collectedBy.js'
import collection from './collection.js'
import content from './content.js'
import articleCover from './cover.js'
import createdAt from './createdAt.js'
import hasAppreciate from './hasAppreciate.js'
import language from './language.js'
import * as articleOSS from './oss.js'
import readTime from './readTime.js'
import relatedArticles from './relatedArticles.js'
import relatedDonationArticles from './relatedDonationArticles.js'
import remark from './remark.js'
import replyToDonator from './replyToDonator.js'
import requestForDonation from './requestForDonation.js'
import revisedAt from './revisedAt.js'
import revisionCount from './revisionCount.js'
import rootArticle from './rootArticle.js'
import state from './state.js'
import sticky from './sticky.js'
import subscribed from './subscribed.js'
import subscribers from './subscribers.js'
import summary from './summary.js'
import tagArticles from './tag/articles.js'
import tagCover from './tag/cover.js'
import tagCreator from './tag/creator.js'
import tagEditors from './tag/editors.js'
import tagFollowers from './tag/followers.js'
import tagIsFollower from './tag/isFollower.js'
import tagIsOfficial from './tag/isOfficial.js'
import tagIsPinned from './tag/isPinned.js'
import tagNumArticles from './tag/numArticles.js'
import tagNumAuthors from './tag/numAuthors.js'
import * as tagOSS from './tag/oss.js'
import tagOwner from './tag/owner.js'
import tagParticipants from './tag/participants.js'
import tagsRecommended from './tag/recommended.js'
import tagSelected from './tag/selected.js'
import tags from './tags.js'
import topicArticleCount from './topic/articleCount.js'
import topicArticles from './topic/articles.js'
import topicAuthor from './topic/author.js'
import topicChapterCount from './topic/chapterCount.js'
import topicChapters from './topic/chapters.js'
import topicCover from './topic/cover.js'
import topicLatestArticle from './topic/latestArticle.js'
import transactionsReceivedBy from './transactionsReceivedBy.js'
import translation from './translation.js'
import userArticles from './user/articles.js'
// import userTags from './user/tags.js'
import userTopics from './user/topics.js'

export default {
  Query: {
    article: rootArticle,
  },
  User: {
    articles: userArticles,
    // tags: userTags,
    topics: userTopics,
  },
  Article: {
    id: ({ articleId, id }: { articleId: string; id: string }) => {
      if (!articleId) {
        logger.warn(
          "Article's fields should derive from Draft instead of Article itself. There are some resolvers needed to be fixed"
        )
        return toGlobalId({ type: NODE_TYPES.Article, id })
      }
      return toGlobalId({ type: NODE_TYPES.Article, id: articleId })
    },
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
    dataHash: ({ dataHash }: { dataHash: string }) => dataHash || '',
    mediaHash: ({ mediaHash }: { mediaHash: string }) => mediaHash || '',
    state,
    sticky,
    subscribed,
    subscribers,
    tags,
    translation,
    availableTranslations,
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
    requestForDonation,
    replyToDonator,
  },
  Tag: {
    id: ({ id }: { id: string }) => toGlobalId({ type: NODE_TYPES.Tag, id }),
    articles: tagArticles,
    selected: tagSelected,
    creator: tagCreator,
    editors: tagEditors,
    owner: tagOwner,
    isFollower: tagIsFollower,
    isPinned: tagIsPinned,
    isOfficial: tagIsOfficial,
    numArticles: tagNumArticles,
    numAuthors: tagNumAuthors,
    followers: tagFollowers,
    oss: (root: any) => root,
    cover: tagCover,
    participants: tagParticipants,
    recommended: tagsRecommended,
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
