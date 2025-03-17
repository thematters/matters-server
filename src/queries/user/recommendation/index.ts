import { GQLRecommendationResolvers } from '#definitions/index.js'

import { authors } from './authors.js'
import { channelArticles } from './channelArticles.js'
import following from './following/index.js'
import { hottest } from './hottest.js'
import { icymi } from './icymi.js'
import { icymiTopic } from './icymiTopic.js'
import { newest } from './newest.js'
import { tags } from './tags.js'

const resolvers: GQLRecommendationResolvers = {
  authors,
  following,
  hottest,
  icymi,
  icymiTopic,
  newest,
  tags,
  channelArticles,
}

export default resolvers
