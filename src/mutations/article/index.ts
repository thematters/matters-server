import publishArticle from './publishArticle'
import archiveArticle from './archiveArticle'
import subscribeArticle from './subscribeArticle'
import unsubscribeArticle from './unsubscribeArticle'
import reportArticle from './reportArticle'
import appreciateArticle from './appreciateArticle'
import readArticle from './readArticle'
import recallPublish from './recallPublish'
import toggleArticleLive from './toggleArticleLive'
import toggleArticlePublic from './toggleArticlePublic'
import setArticleBoost from './setArticleBoost'
import setTagBoost from './setTagBoost'

export default {
  Mutation: {
    publishArticle,
    archiveArticle,
    subscribeArticle,
    unsubscribeArticle,
    reportArticle,
    appreciateArticle,
    readArticle,
    recallPublish,
    toggleArticleLive,
    toggleArticlePublic,
    setArticleBoost,
    setTagBoost
  }
}
