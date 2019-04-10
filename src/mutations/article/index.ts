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
import toggleArticleRecommend from './toggleArticleRecommend'
import updateArticleState from './updateArticleState'
import deleteTags from './deleteTags'
import renameTag from './renameTag'
import mergeTags from './mergeTags'
import updateMattersToday from './updateMattersToday'
import setCollection from './setCollection'

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
    toggleArticleRecommend,
    updateArticleState,
    deleteTags,
    renameTag,
    mergeTags,
    updateMattersToday,
    setCollection
  }
}
