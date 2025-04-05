import addCurationChannelArticles from './addCurationChannelArticles.js'
import classifyArticlesChannels from './classifyArticlesChannels.js'
import deleteCurationChannelArticles from './deleteCurationChannelArticles.js'
import putCurationChannel from './putCurationChannel.js'
import putTopicChannel from './putTopicChannel.js'
import reorderChannels from './reorderChannels.js'
import setArticleTopicChannels from './setArticleTopicChannels.js'

export default {
  Mutation: {
    putTopicChannel,
    putCurationChannel,
    setArticleTopicChannels,
    classifyArticlesChannels,
    addCurationChannelArticles,
    deleteCurationChannelArticles,
    reorderChannels,
  },
}
