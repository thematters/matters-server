import classifyArticlesChannels from './classifyArticlesChannels.js'
import putCurationChannel from './putCurationChannel.js'
import putTopicChannel from './putTopicChannel.js'
import setArticleTopicChannels from './setArticleTopicChannels.js'

export default {
  Mutation: {
    putTopicChannel,
    putCurationChannel,
    setArticleTopicChannels,
    classifyArticlesChannels,
  },
}
