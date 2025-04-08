import type { GQLResolvers } from '#definitions/index.js'

import { ARTICLE_APPRECIATE_LIMIT, NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import * as articleAccess from './access/index.js'
import appreciateLeft from './appreciateLeft.js'
import appreciationsReceived from './appreciationsReceived.js'
import appreciationsReceivedTotal from './appreciationsReceivedTotal.js'
import assets from './assets.js'
import author from './author.js'
import availableTranslations from './availableTranslations.js'
import bookmarked from './bookmarked.js'
import campaigns from './campaigns.js'
import canComment from './canComment.js'
import canSuperLike from './canSuperLike.js'
import collectedBy from './collectedBy.js'
import collection from './collection.js'
import content from './content.js'
import * as contents from './contents/index.js'
import articleCover from './cover.js'
import createdAt from './createdAt.js'
import dataHash from './dataHash.js'
import donated from './donated.js'
import donationCount from './donationCount.js'
import donations from './donations.js'
import hasAppreciate from './hasAppreciate.js'
import idResolver from './id.js'
import indentFirstLine from './indentFirstLine.js'
import iscnId from './iscnId.js'
import language from './language.js'
import license from './license.js'
import mediaHash from './mediaHash.js'
import noindex from './noindex.js'
import * as articleOSS from './oss.js'
import pinned from './pinned.js'
import readerCount from './readerCount.js'
import readTime from './readTime.js'
import relatedArticles from './relatedArticles.js'
import relatedDonationArticles from './relatedDonationArticles.js'
import remark from './remark.js'
import replyToDonator from './replyToDonator.js'
import requestForDonation from './requestForDonation.js'
import revisedAt from './revisedAt.js'
import revisionCount from './revisionCount.js'
import rootArticle from './rootArticle.js'
import sensitiveByAuthor from './sensitiveByAuthor.js'
import shortHash from './shortHash.js'
import slug from './slug.js'
import state from './state.js'
import summary from './summary.js'
import summaryCustomized from './summaryCustomized.js'
import tagArticles from './tag/articles.js'
import tagIsFollower from './tag/isFollower.js'
import tagNumArticles from './tag/numArticles.js'
import tagNumAuthors from './tag/numAuthors.js'
import * as tagOSS from './tag/oss.js'
import tagsRecommended from './tag/recommended.js'
import tagsRecommendedAuthors from './tag/recommendedAuthors.js'
import tags from './tags.js'
import title from './title.js'
import transactionsReceivedBy from './transactionsReceivedBy.js'
import articleTranslation from './translation/article.js'
import articleVersionTranslation from './translation/articleVersion.js'
import userArticles from './user/articles.js'
import versions from './versions.js'

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
    relatedDonationArticles,
    remark,
    slug,
    iscnId,
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
    noindex,
  },
  Tag: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Tag, id }),
    articles: tagArticles,
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
    topicChannels: articleOSS.topicChannels,
  },
  TagOSS: {
    boost: tagOSS.boost,
    score: tagOSS.score,
  },
}

export default schema
