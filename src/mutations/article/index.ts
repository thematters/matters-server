import appreciateArticle from './appreciateArticle.js'
import deleteTags from './deleteTags.js'
import editArticle from './editArticle.js'
import mergeTags from './mergeTags.js'
import publishArticle from './publishArticle.js'
import readArticle from './readArticle.js'
import renameTag from './renameTag.js'
import toggleArticleRecommend from './toggleArticleRecommend.js'
import toggleBookmarkArticle from './toggleBookmarkArticle.js'
import updateArticleSensitive from './updateArticleSensitive.js'
import updateArticleState from './updateArticleState.js'

export default {
  Mutation: {
    publishArticle,
    editArticle,
    appreciateArticle,
    readArticle,
    toggleArticleRecommend,
    toggleBookmarkArticle,
    toggleSubscribeArticle: toggleBookmarkArticle,
    updateArticleState,
    updateArticleSensitive,
    deleteTags,
    renameTag,
    mergeTags,
  },
}
