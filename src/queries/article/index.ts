import type { GQLResolvers } from 'definitions'

import { ARTICLE_APPRECIATE_LIMIT, NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import * as articleAccess from './access'
import appreciateLeft from './appreciateLeft'
import appreciationsReceived from './appreciationsReceived'
import appreciationsReceivedTotal from './appreciationsReceivedTotal'
import assets from './assets'
import author from './author'
import availableTranslations from './availableTranslations'
import bookmarked from './bookmarked'
import campaigns from './campaigns'
import canComment from './canComment'
import canSuperLike from './canSuperLike'
import collectedBy from './collectedBy'
import collection from './collection'
import content from './content'
import * as contents from './contents'
import articleCover from './cover'
import createdAt from './createdAt'
import dataHash from './dataHash'
import donated from './donated'
import donationCount from './donationCount'
import donations from './donations'
import hasAppreciate from './hasAppreciate'
import idResolver from './id'
import indentFirstLine from './indentFirstLine'
import language from './language'
import license from './license'
import mediaHash from './mediaHash'
import * as articleOSS from './oss'
import pinned from './pinned'
import readerCount from './readerCount'
import readTime from './readTime'
import relatedArticles from './relatedArticles'
import relatedArticlesExcludeSpam from './relatedArticlesExcludeSpam'
import relatedDonationArticles from './relatedDonationArticles'
import remark from './remark'
import replyToDonator from './replyToDonator'
import requestForDonation from './requestForDonation'
import revisedAt from './revisedAt'
import revisionCount from './revisionCount'
import rootArticle from './rootArticle'
import sensitiveByAuthor from './sensitiveByAuthor'
import shortHash from './shortHash'
import slug from './slug'
import state from './state'
import summary from './summary'
import summaryCustomized from './summaryCustomized'
import tagArticles from './tag/articles'
import tagArticlesExcludeSpam from './tag/articlesExcludeSpam'
import tagIsFollower from './tag/isFollower'
import tagNumArticles from './tag/numArticles'
import tagNumAuthors from './tag/numAuthors'
import * as tagOSS from './tag/oss'
import tagsRecommended from './tag/recommended'
import tagsRecommendedAuthors from './tag/recommendedAuthors'
import tags from './tags'
import title from './title'
import transactionsReceivedBy from './transactionsReceivedBy'
import articleTranslation from './translation/article'
import articleVersionTranslation from './translation/articleVersion'
import userArticles from './user/articles'
import versions from './versions'

const schema: GQLResolvers = {
  Query: {
    article: rootArticle,
  },
  User: {
    articles: userArticles,
  },
  Article: {
    id: idResolver,
    title,
    content,
    contents: ({ id }, _, { dataSources: { articleService } }) =>
      articleService.loadLatestArticleVersion(id),
    summary,
    summaryCustomized,
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
    oss: (root) => root,
    relatedArticles,
    relatedArticlesExcludeSpam,
    relatedDonationArticles,
    remark,
    slug,
    sensitiveByAuthor,
    dataHash,
    mediaHash,
    shortHash,
    state,
    pinned,
    subscribed: bookmarked,
    bookmarked,
    tags,
    translation: articleTranslation,
    availableTranslations,
    transactionsReceivedBy,
    donations,
    readTime,
    createdAt,
    revisedAt,
    access: (root) => root,
    revisionCount,
    license,
    canComment,
    indentFirstLine,
    donated,
    requestForDonation,
    replyToDonator,
    donationCount,
    readerCount,
    versions,
    campaigns,
  },
  Tag: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Tag, id }),
    articles: tagArticles,
    articlesExcludeSpam: tagArticlesExcludeSpam,
    isFollower: tagIsFollower,
    numArticles: tagNumArticles,
    numAuthors: tagNumAuthors,
    oss: (root) => root,
    recommended: tagsRecommended,
    recommendedAuthors: tagsRecommendedAuthors,
  },
  ArticleVersion: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.ArticleVersion, id }),
    contents: (root) => root,
    translation: articleVersionTranslation,
  },
  ArticleContents: {
    html: contents.html,
    markdown: contents.markdown,
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
    inSearch: articleOSS.inSearch,
    spamStatus: articleOSS.spamStatus,
    channels: articleOSS.channels,
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score,
  },
}

export default schema
