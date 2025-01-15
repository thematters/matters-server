import { GQLRecommendationResolvers } from 'definitions'

import { authors } from './authors'
import following from './following'
import { hottest } from './hottest'
import { icymi } from './icymi'
import { icymiTopic } from './icymiTopic'
import { newest } from './newest'
import { tags } from './tags'

const resolvers: GQLRecommendationResolvers = {
  authors,
  following,
  hottest,
  icymi,
  icymiTopic,
  newest,
  tags,
}

export default resolvers
