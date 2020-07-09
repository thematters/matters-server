import addArticlesTags from './addArticlesTags'
import appreciateArticle from './appreciateArticle'
import archiveArticle from './archiveArticle'
import deleteArticlesTags from './deleteArticlesTags'
import deleteTags from './deleteTags'
import mergeTags from './mergeTags'
import publishArticle from './publishArticle'
import putTag from './putTag'
import readArticle from './readArticle'
import recallPublish from './recallPublish'
import renameTag from './renameTag'
import reportArticle from './reportArticle'
import setCollection from './setCollection'
import subscribeArticle from './subscribeArticle'
import toggleArticleLive from './toggleArticleLive'
import toggleArticlePublic from './toggleArticlePublic'
import toggleArticleRecommend from './toggleArticleRecommend'
import toggleSubscribeArticle from './toggleSubscribeArticle'
import unsubscribeArticle from './unsubscribeArticle'
import updateArticleInfo from './updateArticleInfo'
import updateArticlesTags from './updateArticlesTags'
import updateArticleState from './updateArticleState'

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
    toggleSubscribeArticle,
    updateArticleState,
    deleteTags,
    renameTag,
    mergeTags,
    setCollection,
    updateArticleInfo,
    putTag,
    addArticlesTags,
    deleteArticlesTags,
    updateArticlesTags,
  },
}
