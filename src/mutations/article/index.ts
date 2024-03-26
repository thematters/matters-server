import addArticlesTags from './addArticlesTags'
import appreciateArticle from './appreciateArticle'
import deleteArticlesTags from './deleteArticlesTags'
import deleteTags from './deleteTags'
import editArticle from './editArticle'
import mergeTags from './mergeTags'
import publishArticle from './publishArticle'
import putTag from './putTag'
import readArticle from './readArticle'
import renameTag from './renameTag'
import toggleArticleRecommend from './toggleArticleRecommend'
import toggleSubscribeArticle from './toggleSubscribeArticle'
import toggleTagRecommend from './toggleTagRecommend'
import updateArticleSensitive from './updateArticleSensitive'
import updateArticlesTags from './updateArticlesTags'
import updateArticleState from './updateArticleState'
import updateTagSetting from './updateTagSetting'

export default {
  Mutation: {
    publishArticle,
    editArticle,
    appreciateArticle,
    readArticle,
    toggleArticleRecommend,
    toggleSubscribeArticle,
    updateArticleState,
    updateArticleSensitive,
    deleteTags,
    renameTag,
    mergeTags,
    putTag,
    addArticlesTags,
    deleteArticlesTags,
    updateArticlesTags,
    updateTagSetting,
    toggleTagRecommend,
  },
}
