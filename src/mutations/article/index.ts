import appreciateArticle from './appreciateArticle'
import deleteTags from './deleteTags'
import editArticle from './editArticle'
import mergeTags from './mergeTags'
import publishArticle from './publishArticle'
import readArticle from './readArticle'
import renameTag from './renameTag'
import toggleArticleRecommend from './toggleArticleRecommend'
import toggleBookmarkArticle from './toggleBookmarkArticle'
import updateArticleSensitive from './updateArticleSensitive'
import updateArticleState from './updateArticleState'

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
