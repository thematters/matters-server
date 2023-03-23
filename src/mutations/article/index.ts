import addArticlesTags from './addArticlesTags.js'
import appreciateArticle from './appreciateArticle.js'
import deleteArticlesTags from './deleteArticlesTags.js'
import deleteTags from './deleteTags.js'
import deleteTopics from './deleteTopics.js'
import editArticle from './editArticle.js'
import mergeTags from './mergeTags.js'
import publishArticle from './publishArticle.js'
import putChapter from './putChapter.js'
import putTag from './putTag.js'
import putTopic from './putTopic.js'
import readArticle from './readArticle.js'
import renameTag from './renameTag.js'
import sortTopics from './sortTopics.js'
import toggleArticleRecommend from './toggleArticleRecommend.js'
import toggleSubscribeArticle from './toggleSubscribeArticle.js'
import toggleTagRecommend from './toggleTagRecommend.js'
import updateArticlesTags from './updateArticlesTags.js'
import updateArticleState from './updateArticleState.js'
import updateTagSetting from './updateTagSetting.js'

export default {
  Mutation: {
    publishArticle,
    editArticle,
    appreciateArticle,
    readArticle,
    toggleArticleRecommend,
    toggleSubscribeArticle,
    updateArticleState,
    deleteTags,
    renameTag,
    mergeTags,
    putTag,
    addArticlesTags,
    deleteArticlesTags,
    updateArticlesTags,
    updateTagSetting,
    toggleTagRecommend,
    putChapter,
    putTopic,
    deleteTopics,
    sortTopics,
  },
}
